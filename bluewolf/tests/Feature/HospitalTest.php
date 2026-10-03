<?php

namespace Tests\Feature;

use App\Models\Army;
use App\Models\Building;
use App\Models\Player;
use App\Models\PlayerResource;
use App\Models\Queue;
use App\Services\TutorialService;
use App\Support\Formula;
use App\Support\TelegramInitData;
use Database\Seeders\GameConfigSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/** Shifo gʻori (GDD bo'lim 5): sigʻim, vaqt, oʻt, tabiiy navbatdan olish, bitta umumiy muolaja. */
class HospitalTest extends TestCase
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

    /** @return array<string, float> */
    private function cfg(): array
    {
        return json_decode(file_get_contents(base_path('public/data/game_config.json')), true);
    }

    private function player(int $level, int $hospital, float $herb = 100): Player
    {
        $this->getJson('/api/v1/state', $this->headers())->assertOk();
        Player::query()->update(['level' => $level, 'xp' => Formula::totalXp($this->cfg(), $level), 'tutorial_step' => TutorialService::total()]);
        $this->getJson('/api/v1/state', $this->headers())->assertOk();
        Building::query()->where('type', 'hospital')->update(['level' => $hospital]);
        Building::query()->where('type', 'food_cave')->update(['level' => $level]);
        PlayerResource::query()->update(['herb' => $herb, 'meat' => 500]);

        return Player::query()->first();
    }

    /** Ovdan qaytgan yaradorlar: Army.injured + tabiiy tuzalish navbatlari (daqiqa → soni). */
    private function wounded(Player $player, string $role, int $tier, array $rows): void
    {
        Army::query()->create(['player_id' => $player->id, 'role' => $role, 'tier' => $tier, 'alive' => 5, 'injured' => array_sum($rows)]);
        foreach ($rows as $minutes => $qty) {
            $player->queues()->create(['kind' => 'heal', 'role' => $role, 'tier' => $tier, 'qty' => $qty, 'cost' => [],
                'started_at' => now(), 'ends_at' => now()->addMinutes($minutes)]);
        }
    }

    public function test_formulas_match_client(): void
    {
        $cases = json_decode(file_get_contents(base_path('tests/fixtures/army_cases.json')), true);
        $this->assertNotEmpty($cases['heal']);
        foreach ($cases['heal'] as $c) {
            $this->assertSame($c['cap'], Formula::hospitalCap($this->cfg(), $c['building']));
            $this->assertEqualsWithDelta($c['minutes'], Formula::healMinutes($this->cfg(), $c['building']), 1e-6);
            $this->assertEqualsWithDelta($c['herb'], Formula::healHerb($this->cfg(), $c['tier'], $c['level']), 1e-9);
            $this->assertEquals($c['plan'], Formula::healPlan($this->cfg(), $c['building'], $c['level'], $c['troops']));
        }
        // GDD: qurilmagan — 0; 1-daraja — 2 boʻri, 60 daqiqa, T1 = 2 oʻt (birlik 1)
        $this->assertSame(0, Formula::hospitalCap($this->cfg(), 0));
        $this->assertSame(2, Formula::hospitalCap($this->cfg(), 1));
        $this->assertEqualsWithDelta(60.0, Formula::healMinutes($this->cfg(), 1), 1e-9);
        $this->assertEqualsWithDelta(2.0, Formula::healHerb($this->cfg(), 1, 4), 1e-9);
    }

    public function test_requires_hospital(): void
    {
        $player = $this->player(5, 0);
        $this->wounded($player, 'hunter', 1, [180 => 3]);
        $this->postJson('/api/v1/hospital/heal', ['troops' => ['hunter' => ['1' => 3]]], $this->headers())
            ->assertStatus(400)->assertJsonPath('error.code', 'LEVEL_TOO_LOW');
    }

    public function test_heal_takes_from_natural_queue_and_finishes_early(): void
    {
        $cfg = $this->cfg();
        $player = $this->player(10, 3, 50);
        $this->wounded($player, 'hunter', 1, [100 => 6, 170 => 4]);
        $h = $this->headers();

        // Yaradordan koʻp va oʻt yetmasa — rad etiladi, hech narsa oʻzgarmaydi
        $this->postJson('/api/v1/hospital/heal', ['troops' => ['hunter' => ['1' => 11]]], $h)
            ->assertStatus(400)->assertJsonPath('error.code', 'NOT_ENOUGH_TROOPS')->assertJsonPath('error.details.available', 10);
        PlayerResource::query()->update(['herb' => 1]);
        $this->postJson('/api/v1/hospital/heal', ['troops' => ['hunter' => ['1' => 7]]], $h)
            ->assertStatus(400)->assertJsonPath('error.code', 'NOT_ENOUGH_RESOURCES');
        PlayerResource::query()->update(['herb' => 50]);

        $res = $this->postJson('/api/v1/hospital/heal', ['troops' => ['hunter' => ['1' => 7]]], $h)->assertOk();
        $plan = Formula::healPlan($cfg, 3, 10, ['hunter' => [1 => 7]]);
        $res->assertJsonPath('data.plan.qty', 7)->assertJsonPath('data.plan.waves', $plan['waves']);
        $this->assertEqualsWithDelta(50 - $plan['herb'], (float) PlayerResource::query()->value('herb'), 0.01);

        // Tabiiy navbat: eng kech tugaydigan (4) toʻliq, keyingisidan 3 olindi → 3 qoldi
        $natural = Queue::query()->where(['kind' => 'heal', 'state' => 'running'])->whereNull('building_type')->get();
        $this->assertSame([3], $natural->pluck('qty')->all());
        $hospital = Queue::query()->where(['kind' => 'heal', 'state' => 'running', 'building_type' => 'hospital'])->get();
        $this->assertCount(1, $hospital);
        $this->assertSame(7, $hospital[0]->qty);

        // Shifo gʻori band (qisqa shakl: role, tier, qty)
        $this->postJson('/api/v1/hospital/heal', ['role' => 'hunter', 'tier' => 1, 'qty' => 1], $h)->assertStatus(409)->assertJsonPath('error.code', 'QUEUE_BUSY');

        Carbon::setTestNow(now()->addMinutes((int) ceil($plan['minutes'])));
        $finished = collect($this->getJson('/api/v1/state', $h)->assertOk()->json('data.finished'))->where('kind', 'heal');
        $this->assertSame([3, 7], $finished->pluck('qty')->values()->all(), 'avval tabiiy (100 daq), keyin Shifo gʻori');
        $this->assertSame([false, true], $finished->pluck('hospital')->values()->all());
        $row = Army::query()->where('role', 'hunter')->first();
        $this->assertSame(0, $row->injured);
        $this->assertSame(15, $row->alive);
    }

    public function test_one_treatment_for_several_groups_speeds_up_together(): void
    {
        $player = $this->player(12, 6, 200);
        Player::query()->update(['free_speedups' => 2]);
        $this->wounded($player, 'hunter', 1, [180 => 30]);
        $this->wounded($player, 'attacker', 2, [180 => 20]);
        $h = $this->headers();

        $res = $this->postJson('/api/v1/hospital/heal', ['troops' => ['hunter' => ['1' => 30], 'attacker' => ['2' => 20]]], $h)->assertOk();
        $queues = $res->json('data.queues');
        $this->assertCount(2, $queues);
        $this->assertSame($queues[0]['ends_at'], $queues[1]['ends_at'], 'bitta umumiy taymer');
        $plan = Formula::healPlan($this->cfg(), 6, 12, ['hunter' => [1 => 30], 'attacker' => [2 => 20]]);
        $this->assertSame(50, $plan['qty']);
        $this->assertEqualsWithDelta($plan['minutes'] * 60000, $queues[0]['ends_at'] - $queues[0]['started_at'], 1);

        $this->postJson('/api/v1/queue/speedup', ['queue_id' => $queues[1]['id'], 'use_free' => true], $h)->assertOk();
        $ends = Queue::query()->where(['state' => 'running', 'building_type' => 'hospital'])->pluck('ends_at')->map->getTimestampMs()->unique();
        $this->assertCount(1, $ends);
        $this->assertSame($queues[0]['ends_at'] - 3600000, $ends->first());

        // Muolajani bekor qilib boʻlmaydi
        $this->postJson('/api/v1/queue/cancel', ['queue_id' => $queues[0]['id']], $h)->assertStatus(422);
    }
}
