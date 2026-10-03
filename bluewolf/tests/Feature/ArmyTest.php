<?php

namespace Tests\Feature;

use App\Models\Army;
use App\Models\Player;
use App\Models\PlayerResource;
use App\Services\TutorialService;
use App\Support\Formula;
use App\Support\TelegramInitData;
use Database\Seeders\GameConfigSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ArmyTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = '123456:TEST-token';

    protected function setUp(): void
    {
        parent::setUp();
        config(['bluewolf.bot_token' => self::TOKEN]);
        $this->seed(GameConfigSeeder::class);
        Carbon::setTestNow('2026-10-03 10:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** @return array<string, string> */
    private function headers(): array
    {
        return ['X-Init-Data' => TelegramInitData::sign([
            'auth_date' => time(),
            'user' => json_encode(['id' => 42, 'first_name' => 'Alfa']),
        ], self::TOKEN)];
    }

    private function player(int $level, array $resources = []): Player
    {
        $this->getJson('/api/v1/state', $this->headers())->assertOk();
        $xp = Formula::totalXp($this->cfg(), $level);
        Player::query()->update(['level' => $level, 'xp' => $xp, 'tutorial_step' => TutorialService::total()]);
        $this->getJson('/api/v1/state', $this->headers())->assertOk();
        PlayerResource::query()->update($resources + ['meat' => 50, 'bone' => 500]);

        return Player::query()->first();
    }

    /** @return array<string, float> */
    private function cfg(): array
    {
        return json_decode(file_get_contents(base_path('public/data/game_config.json')), true);
    }

    public function test_formulas_match_client(): void
    {
        $cases = json_decode(file_get_contents(base_path('tests/fixtures/army_cases.json')), true);
        foreach ($cases['train'] as $c) {
            $this->assertSame($c['cost'], Formula::trainCost($this->cfg(), $c['tier']));
            $this->assertEqualsWithDelta($c['seconds'], Formula::trainSeconds($this->cfg(), $c['tier'], $c['level'], $c['building'], $c['army'], $c['role']), 1e-5);
        }
        $hunt = json_decode(file_get_contents(base_path('tests/fixtures/hunt_board_cases.json')), true);
        foreach ($hunt['boards'] as $b) {
            $this->assertEquals($b['cards'], Formula::huntBoard($this->cfg(), $b['player'], $b['level'], $b['window']), "player {$b['player']} L{$b['level']}");
        }
        foreach ($hunt['results'] as $c) {
            $payload = array_map(fn ($tiers) => array_combine(array_map('intval', array_keys($tiers)), array_values($tiers)), $c['payload']);
            $this->assertEquals($c['result'], Formula::huntResult($this->cfg(), $c['level'], $c['card'], $payload));
        }
    }

    public function test_hunt_board_is_sorted_personal_and_refreshes(): void
    {
        $cfg = $this->cfg();
        $a = Formula::huntBoard($cfg, 1, 10, 100);
        $this->assertCount(9, $a);
        for ($i = 1; $i < 9; $i++) {
            $this->assertGreaterThanOrEqual($a[$i - 1]['minutes'], $a[$i]['minutes']);
            $this->assertGreaterThanOrEqual($a[$i - 1]['herd_kg'], $a[$i]['herd_kg']);
        }
        $this->assertLessThanOrEqual(10 + 2 * 25 / 40 * 60, $a[8]['minutes']); // eng uzoq ov ≤ 85 daqiqa
        $this->assertSame(0.0, (float) $a[0]['injury']);                        // yaqin — xavfsiz
        $this->assertGreaterThan(0, $a[8]['death']);                             // uzoq — halokat xavfi
        $this->assertNotEquals($a, Formula::huntBoard($cfg, 2, 10, 100));        // boshqa oʻyinchi
        $this->assertNotEquals($a, Formula::huntBoard($cfg, 1, 10, 101));        // keyingi davr
    }

    public function test_train_adds_soldiers_and_they_eat(): void
    {
        $this->player(4);
        $h = $this->headers();

        $res = $this->postJson('/api/v1/army/train', ['role' => 'hunter', 'tier' => 1, 'qty' => 2], $h)
            ->assertOk()
            ->assertJsonPath('data.queue.kind', 'train')
            ->assertJsonPath('state.resources.meat', 10)   // 50 − 2 × 20
            ->assertJsonPath('state.resources.bone', 484); // 500 − 2 × 8
        $seconds = ($res->json('data.queue.ends_at') - $res->json('data.queue.started_at')) / 1000;
        $this->assertEqualsWithDelta(2 * 120 / 1.03, $seconds, 0.01); // boʻsh qoʻshin: ×0.5, In 4-daraja: ×1.03

        $this->postJson('/api/v1/army/train', ['role' => 'hunter', 'tier' => 1, 'qty' => 1], $h)
            ->assertStatus(409)->assertJsonPath('error.code', 'QUEUE_BUSY');
        $this->postJson('/api/v1/army/train', ['role' => 'attacker', 'tier' => 2, 'qty' => 1], $h)
            ->assertStatus(400)->assertJsonPath('error.code', 'TIER_LOCKED');
        $this->postJson('/api/v1/army/train', ['role' => 'attacker', 'tier' => 1, 'qty' => 9], $h)
            ->assertStatus(400)->assertJsonPath('error.code', 'CAPACITY_FULL'); // sigʻim 10, 2 tasi navbatda

        Carbon::setTestNow(now()->addSeconds((int) ceil($seconds)));
        $state = $this->getJson('/api/v1/state', $h)->assertOk()
            ->assertJsonPath('data.army.hunter.0', 2)
            ->assertJsonPath('data.economy.army', 2)
            ->assertJsonPath('data.finished.0.kind', 'train');

        // Ikki askar soatiga 2 × 0.9 / 24 kg yeydi
        Carbon::setTestNow(now()->addHours(10));
        $meat = $this->getJson('/api/v1/state', $h)->json('data.economy.res.meat');
        $this->assertEqualsWithDelta(10 - 2 * 0.9 / 24 * 10, $meat, 0.01);
    }

    public function test_hunt_card_returns_meat_xp_and_levels_up(): void
    {
        $player = $this->player(4, ['meat' => 0]);
        Army::query()->create(['player_id' => $player->id, 'role' => 'hunter', 'tier' => 1, 'alive' => 2]);
        Army::query()->create(['player_id' => $player->id, 'role' => 'attacker', 'tier' => 1, 'alive' => 3]);
        Player::query()->update(['xp' => Formula::totalXp($this->cfg(), 5) - 1]); // 5-darajaga 1 XP qoldi
        $h = $this->headers();

        $board = $this->getJson('/api/v1/hunt/board', $h)->assertOk()->assertJsonCount(9, 'data.cards')->json('data');
        $card = $board['cards'][0];
        $expected = Formula::huntResult($this->cfg(), 4, $card, ['hunter' => [1 => 2]]);

        $this->postJson('/api/v1/hunt', ['slot' => 0, 'payload' => ['attacker' => ['1' => 1]]], $h)->assertStatus(422);
        $this->postJson('/api/v1/hunt', ['slot' => 0, 'payload' => ['hunter' => ['1' => 3]]], $h)->assertStatus(422);
        $this->postJson('/api/v1/hunt', ['slot' => 9, 'payload' => ['hunter' => ['1' => 1]]], $h)->assertStatus(422);
        $res = $this->postJson('/api/v1/hunt', ['slot' => 0, 'payload' => ['hunter' => ['1' => 2]]], $h)
            ->assertOk()
            ->assertJsonPath('data.march.loot.meat', $expected['meat'])
            ->assertJsonPath('state.army.hunter.0', 0)
            ->assertJsonPath('state.army_away.hunter.0', 2)
            ->assertJsonPath('state.hunt_board.cards.0.status', 'hunting');
        $this->assertArrayNotHasKey('casualties', $res->json('data.march.loot'));
        $this->postJson('/api/v1/hunt', ['slot' => 0, 'payload' => ['attacker' => ['1' => 1]]], $h)->assertStatus(409); // karta band

        Carbon::setTestNow(now()->addMinutes($card['minutes']));
        $state = $this->getJson('/api/v1/state', $h)->assertOk()
            ->assertJsonPath('data.finished.0.kind', 'hunt')
            ->assertJsonPath('data.finished.0.injured', 0) // yaqin karta — xavfsiz
            ->assertJsonPath('data.army.hunter.0', 2)
            ->assertJsonPath('data.hunt_board.cards.0.status', 'done')
            ->assertJsonCount(0, 'data.marches');
        $this->assertEquals($expected['meat'], $state->json('data.finished.0.meat'));
        if ($expected['xp'] >= 1) {
            $state->assertJsonPath('data.player.level', 5);
        }
        $this->postJson('/api/v1/hunt', ['slot' => 0, 'payload' => ['hunter' => ['1' => 1]]], $h)->assertStatus(409);
    }

    public function test_far_hunt_wounds_and_kills_and_wounded_heal(): void
    {
        $player = $this->player(25, ['meat' => 0]);
        Army::query()->create(['player_id' => $player->id, 'role' => 'hunter', 'tier' => 1, 'alive' => 400]);
        $h = $this->headers();

        $card = $this->getJson('/api/v1/hunt/board', $h)->json('data.cards.8');
        $this->assertGreaterThan(0, $card['injury']);
        $this->postJson('/api/v1/hunt', ['slot' => 8, 'payload' => ['hunter' => ['1' => 400]]], $h)->assertOk();

        Carbon::setTestNow(now()->addMinutes($card['minutes']));
        $hunt = $this->getJson('/api/v1/state', $h)->assertOk()->json('data.finished.0');
        $this->assertSame('hunt', $hunt['kind']);
        // 400 boʻri: ~15% yarador, ~4% halok — tasodif, lekin 0 boʻlishi deyarli imkonsiz
        $this->assertGreaterThan(20, $hunt['injured']);
        $this->assertGreaterThan(3, $hunt['dead']);
        $row = Army::query()->where('role', 'hunter')->first();
        $this->assertSame(400 - $hunt['dead'], $row->alive + $row->injured);
        $this->assertSame($hunt['injured'], $row->injured);

        Carbon::setTestNow(now()->addMinutes(180));
        $this->getJson('/api/v1/state', $h)->assertOk()->assertJsonPath('data.finished.0.kind', 'heal');
        $row = Army::query()->where('role', 'hunter')->first();
        $this->assertSame(0, $row->injured);
        $this->assertSame(400 - $hunt['dead'], $row->alive);
    }

    public function test_solo_hunt_with_cooldown(): void
    {
        $this->getJson('/api/v1/state', $this->headers())->assertOk();
        Player::query()->update(['tutorial_step' => TutorialService::total()]);
        $h = $this->headers();

        $this->postJson('/api/v1/hunt/solo', [], $h)
            ->assertOk()
            ->assertJsonPath('data.loot.meat', 0.5)
            ->assertJsonPath('state.player.solo_hunt_at', now()->getTimestampMs());
        $this->postJson('/api/v1/hunt/solo', [], $h)->assertStatus(400)->assertJsonPath('error.code', 'COOLDOWN');

        Carbon::setTestNow(now()->addMinutes(2));
        $this->postJson('/api/v1/hunt/solo', [], $h)->assertOk();
        $this->assertEqualsWithDelta(1.0, (float) PlayerResource::query()->value('meat'), 0.01);
        $this->assertEqualsWithDelta(0.5, (float) Player::query()->value('xp'), 0.001);

        Player::query()->update(['level' => 4]);
        Carbon::setTestNow(now()->addMinutes(5));
        $this->postJson('/api/v1/hunt/solo', [], $h)->assertStatus(400)->assertJsonPath('error.code', 'LEVEL_TOO_LOW');
    }
}
