<?php

namespace Tests\Feature;

use App\Models\Army;
use App\Models\Player;
use App\Models\PlayerResource;
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
        Player::query()->update(['level' => $level, 'xp' => $xp]);
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
        foreach ($cases['hunt'] as $c) {
            $payload = array_map(fn ($tiers) => array_combine(array_map('intval', array_keys($tiers)), array_values($tiers)), $c['payload']);
            $this->assertEquals($c['result'], Formula::huntResult($this->cfg(), $c['level'], $payload));
        }
        // GDD bo'lim 4 jadvali: 4-daraja, 2 ovchi → 9 kg; 10-daraja, 5 ovchi → ~38 kg
        $this->assertEquals(9, Formula::huntResult($this->cfg(), 4, ['hunter' => [1 => 2]])['meat']);
        $this->assertEquals(37.5, Formula::huntResult($this->cfg(), 10, ['hunter' => [1 => 5]])['meat']);
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

    public function test_hunt_returns_meat_xp_and_levels_up(): void
    {
        $player = $this->player(4, ['meat' => 0]);
        Army::query()->create(['player_id' => $player->id, 'role' => 'hunter', 'tier' => 1, 'alive' => 2]);
        Army::query()->create(['player_id' => $player->id, 'role' => 'attacker', 'tier' => 1, 'alive' => 3]);
        Player::query()->update(['xp' => Formula::totalXp($this->cfg(), 5) - 1]); // 5-darajaga 1 XP qoldi
        $h = $this->headers();

        $this->postJson('/api/v1/hunt', ['payload' => ['attacker' => ['1' => 1]]], $h)->assertStatus(422);
        $this->postJson('/api/v1/hunt', ['payload' => ['hunter' => ['1' => 3]]], $h)->assertStatus(422);
        $this->postJson('/api/v1/hunt', ['payload' => ['hunter' => ['1' => 2]]], $h)
            ->assertOk()
            ->assertJsonPath('data.march.loot.meat', 9)
            ->assertJsonPath('state.army.hunter.0', 0)
            ->assertJsonPath('state.army_away.hunter.0', 2)
            ->assertJsonCount(1, 'state.marches');
        $this->postJson('/api/v1/hunt', ['payload' => ['hunter' => ['1' => 1]]], $h)->assertStatus(409);

        Carbon::setTestNow(now()->addMinutes(60));
        $this->getJson('/api/v1/state', $h)->assertOk()
            ->assertJsonPath('data.finished.0.kind', 'hunt')
            ->assertJsonPath('data.finished.0.meat', 9)
            ->assertJsonPath('data.finished.1.kind', 'level')
            ->assertJsonPath('data.finished.1.level', 5)
            ->assertJsonPath('data.player.level', 5)
            ->assertJsonPath('data.army.hunter.0', 2)
            ->assertJsonCount(0, 'data.marches');

        $meat = (float) PlayerResource::query()->value('meat');
        $this->assertGreaterThan(8.9, $meat); // 9 kg, sarf faqat qaytgandan keyin bir lahza
        $this->assertSame(5, Player::query()->value('level'));
    }

    public function test_hunt_meat_is_capped_by_cave(): void
    {
        $player = $this->player(10, ['meat' => 75]);
        Army::query()->create(['player_id' => $player->id, 'role' => 'hunter', 'tier' => 1, 'alive' => 5]);
        // Oziq gʻori 1-daraja: sigʻim 40 kg, ov qaytganda oʻyinchi oflayn → ×2 = 80 kg; 3 ta ovchi — kiyik uchun min toʻda 3
        $this->postJson('/api/v1/hunt', ['payload' => ['hunter' => ['1' => 3]]], $this->headers())->assertOk();
        Carbon::setTestNow(now()->addMinutes(60));
        $lost = $this->getJson('/api/v1/state', $this->headers())->json('data.finished.0.lost');
        // 22.5 kg keldi; ov davomida 5 askar 5 × 1.5 / 24 kg yedi → sigʻimga 5.31 kg sigʻdi
        $this->assertEqualsWithDelta(22.5 - (5 + 5 * 1.5 / 24), $lost, 0.01);
        $this->assertEqualsWithDelta(80, (float) PlayerResource::query()->value('meat'), 0.01);
    }

    public function test_solo_hunt_with_cooldown(): void
    {
        $this->getJson('/api/v1/state', $this->headers())->assertOk();
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
