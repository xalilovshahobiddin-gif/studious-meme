<?php

namespace Tests\Feature;

use App\Models\Building;
use App\Models\Player;
use App\Models\PlayerResource;
use App\Models\Queue;
use App\Services\BuildService;
use App\Support\TelegramInitData;
use Database\Seeders\GameConfigSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BuildTest extends TestCase
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

    /** 5-darajali oʻyinchi, omborda yetarli resurs. */
    private function player(array $resources = ['stone' => 5000, 'wood' => 5000, 'hide' => 5000, 'bone' => 5000]): void
    {
        $this->getJson('/api/v1/state', $this->headers())->assertOk();
        Player::query()->update(['level' => 5]);
        $this->getJson('/api/v1/state', $this->headers())->assertOk();
        PlayerResource::query()->update($resources);
    }

    public function test_cost_and_time_match_client_formulas(): void
    {
        $cfg = json_decode(file_get_contents(base_path('public/data/game_config.json')), true);

        // tests/js/game.test.js dagi qiymatlar bilan bir xil (Excel Binolar varagʻi)
        $this->assertSame(['stone' => 231, 'wood' => 154, 'bone' => 62], BuildService::cost($cfg, 'workshop', 5));
        $this->assertSame(['stone' => 40, 'wood' => 24], BuildService::cost($cfg, 'food_cave', 2));
        $this->assertSame([], BuildService::cost($cfg, 'market', 1));
        $this->assertSame(153445, array_sum(BuildService::cost($cfg, 'battle_ground', 25)));
        $this->assertSame(35.3, round(BuildService::seconds($cfg, 'food_cave', 25) / 360) / 10);
    }

    public function test_new_player_gets_free_speedups(): void
    {
        $this->getJson('/api/v1/state', $this->headers())
            ->assertJsonPath('data.player.free_speedups', 5)
            ->assertJsonPath('data.player.build_slots', 1);
    }

    public function test_upgrade_takes_resources_and_finishes_on_time(): void
    {
        $this->player();
        $cost = BuildService::cost(json_decode(file_get_contents(base_path('public/data/game_config.json')), true), 'workshop', 2);

        $res = $this->postJson('/api/v1/buildings/upgrade', ['type' => 'workshop'], $this->headers())
            ->assertOk()
            ->assertJsonPath('data.queue.building_type', 'workshop')
            ->assertJsonPath('data.queue.target_level', 2)
            ->assertJsonPath('state.resources.stone', 5000 - $cost['stone'])
            ->assertJsonCount(1, 'state.queues');
        $seconds = ($res->json('data.queue.ends_at') - $res->json('data.queue.started_at')) / 1000;
        $this->assertSame(288, (int) $seconds); // 10 daq × 1.2 (Ustaxona) × 0.4 (stage_early)

        // Vaqt toʻlmaguncha — daraja oʻzgarmaydi
        Carbon::setTestNow(now()->addSeconds($seconds - 1));
        $this->getJson('/api/v1/state', $this->headers())->assertJsonCount(1, 'data.queues');
        $this->assertSame(1, Building::query()->where('type', 'workshop')->value('level'));

        Carbon::setTestNow(now()->addSeconds(2));
        $this->getJson('/api/v1/state', $this->headers())
            ->assertJsonCount(0, 'data.queues')
            ->assertJsonPath('data.finished.0.type', 'workshop')
            ->assertJsonPath('data.finished.0.level', 2);
        $this->assertSame(2, Building::query()->where('type', 'workshop')->value('level'));
        $this->assertSame('done', Queue::query()->value('state'));
    }

    public function test_upgrade_rules(): void
    {
        $this->player(['stone' => 10, 'wood' => 0, 'hide' => 0, 'bone' => 0]);
        $h = $this->headers();

        $this->postJson('/api/v1/buildings/upgrade', ['type' => 'den'], $h)->assertStatus(400)->assertJsonPath('error.code', 'DEN_AUTO_LEVEL');
        $this->postJson('/api/v1/buildings/upgrade', ['type' => 'market'], $h)->assertStatus(400)->assertJsonPath('error.code', 'LEVEL_TOO_LOW');
        $this->postJson('/api/v1/buildings/upgrade', ['type' => 'castle'], $h)->assertStatus(422);
        $this->postJson('/api/v1/buildings/upgrade', ['type' => 'workshop'], $h)
            ->assertStatus(400)->assertJsonPath('error.code', 'NOT_ENOUGH_RESOURCES')->assertJsonPath('error.details.missing.wood', 40);
        $this->assertSame(0, Queue::query()->count());

        PlayerResource::query()->update(['stone' => 5000, 'wood' => 5000, 'hide' => 5000, 'bone' => 5000]);
        $this->postJson('/api/v1/buildings/upgrade', ['type' => 'workshop'], $h)->assertOk();
        $this->postJson('/api/v1/buildings/upgrade', ['type' => 'food_cave'], $h)->assertStatus(409)->assertJsonPath('error.code', 'QUEUE_BUSY');

        // Bino oʻyinchi darajasidan oshmaydi
        Building::query()->where('type', 'hunt_path')->update(['level' => 5]);
        Player::query()->update(['level' => 10]); // 2 slot
        $this->postJson('/api/v1/buildings/upgrade', ['type' => 'workshop'], $h)->assertStatus(409); // shu bino qurilmoqda
        $this->postJson('/api/v1/buildings/upgrade', ['type' => 'food_cave'], $h)->assertOk()->assertJsonPath('data.queue.slot', 2);
    }

    public function test_building_cannot_exceed_player_level(): void
    {
        $this->player();
        Building::query()->where('type', 'workshop')->update(['level' => 5]);
        $this->postJson('/api/v1/buildings/upgrade', ['type' => 'workshop'], $this->headers())
            ->assertStatus(400)->assertJsonPath('error.code', 'LEVEL_TOO_LOW');
    }

    public function test_cancel_refunds_80_percent(): void
    {
        $this->player();
        $id = $this->postJson('/api/v1/buildings/upgrade', ['type' => 'workshop'], $this->headers())->json('data.queue.id');

        $this->postJson('/api/v1/queue/cancel', ['queue_id' => $id], $this->headers())
            ->assertOk()
            ->assertJsonPath('data.refund.stone', 48) // 60 × 0.8
            ->assertJsonPath('state.resources.stone', 5000 - 60 + 48)
            ->assertJsonCount(0, 'state.queues');
        $this->postJson('/api/v1/queue/cancel', ['queue_id' => $id], $this->headers())->assertStatus(404);
    }

    public function test_free_speedup_finishes_short_build(): void
    {
        $this->player();
        $id = $this->postJson('/api/v1/buildings/upgrade', ['type' => 'workshop'], $this->headers())->json('data.queue.id');

        $this->postJson('/api/v1/queue/speedup', ['queue_id' => $id], $this->headers())->assertStatus(400)->assertJsonPath('error.code', 'NOT_AVAILABLE');
        $this->postJson('/api/v1/queue/speedup', ['queue_id' => $id, 'use_free' => true], $this->headers())
            ->assertOk()
            ->assertJsonPath('data.finished.0.type', 'workshop')
            ->assertJsonPath('state.free_speedups', 4)
            ->assertJsonCount(0, 'state.queues');
        $this->assertSame(2, Building::query()->where('type', 'workshop')->value('level'));

        Player::query()->update(['free_speedups' => 0]);
        $id = $this->postJson('/api/v1/buildings/upgrade', ['type' => 'food_cave'], $this->headers())->json('data.queue.id');
        $this->postJson('/api/v1/queue/speedup', ['queue_id' => $id, 'use_free' => true], $this->headers())->assertStatus(400);
    }
}
