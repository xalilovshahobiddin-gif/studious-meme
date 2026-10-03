<?php

namespace Tests\Feature;

use App\Models\Building;
use App\Models\Player;
use App\Models\PlayerResource;
use App\Support\TelegramInitData;
use Database\Seeders\GameConfigSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = '123456:TEST-token';

    protected function setUp(): void
    {
        parent::setUp();
        config(['bluewolf.bot_token' => self::TOKEN, 'bluewolf.dev_auth' => false]);
        $this->seed(GameConfigSeeder::class);
    }

    private function initData(int $id = 42): string
    {
        return TelegramInitData::sign([
            'auth_date' => time(),
            'user' => json_encode(['id' => $id, 'first_name' => 'Alfa', 'username' => 'alfa', 'language_code' => 'ru']),
        ], self::TOKEN);
    }

    public function test_ping_returns_version(): void
    {
        $this->getJson('/api/v1/ping')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('data.version', '0.0.5');
    }

    public function test_state_requires_valid_init_data(): void
    {
        $this->getJson('/api/v1/state')
            ->assertStatus(401)
            ->assertJsonPath('ok', false)
            ->assertJsonPath('error.code', 'UNAUTHORIZED');

        $this->getJson('/api/v1/state', ['X-Init-Data' => 'auth_date=1&hash=abc'])->assertStatus(401);
    }

    public function test_state_creates_player_on_first_visit(): void
    {
        $response = $this->getJson('/api/v1/state', ['X-Init-Data' => $this->initData()]);

        $response->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('data.player.name', 'Alfa')
            ->assertJsonPath('data.player.level', 1)
            ->assertJsonPath('data.player.lang', 'ru')
            ->assertJsonPath('data.resources.meat', 0)
            ->assertJsonCount(count(Building::TYPES), 'data.buildings')
            ->assertJsonStructure(['state' => ['resources', 'queues', 'server_time']]);

        $den = collect($response->json('data.buildings'))->firstWhere('type', 'den');
        $this->assertSame(1, $den['level']);
        $this->assertFalse($den['locked']);
        $market = collect($response->json('data.buildings'))->firstWhere('type', 'market');
        $this->assertTrue($market['locked']);

        $this->getJson('/api/v1/state', ['X-Init-Data' => $this->initData()])->assertOk();
        $this->assertSame(1, Player::query()->count());
    }

    public function test_den_follows_player_level(): void
    {
        $this->getJson('/api/v1/state', ['X-Init-Data' => $this->initData()])->assertOk();
        Player::query()->update(['level' => 5]);

        $buildings = collect($this->getJson('/api/v1/state', ['X-Init-Data' => $this->initData()])->json('data.buildings'));

        $this->assertSame(5, $buildings->firstWhere('type', 'den')['level']);
        $this->assertSame(1, $buildings->firstWhere('type', 'battle_ground')['level']);
        $this->assertSame(0, $buildings->firstWhere('type', 'hospital')['level']);
    }

    public function test_dev_auth_only_when_enabled(): void
    {
        $this->getJson('/api/v1/state', ['X-Dev-User' => '7'])->assertStatus(401);

        config(['bluewolf.dev_auth' => true]);
        $this->getJson('/api/v1/state', ['X-Dev-User' => '7'])->assertOk()->assertJsonPath('data.player.name', 'Dev');
    }

    public function test_config_returns_balance_params(): void
    {
        $this->getJson('/api/v1/config')
            ->assertOk()
            ->assertJsonPath('data.params.xp_base', 80)
            ->assertJsonPath('data.params.hunter_yield_mult', 5);
    }

    /** 5-darajali oʻyinchi: Ustaxona 1, Oziq gʻori 1 (cfg seed qilingan). */
    private function playerAtLevel5(): void
    {
        $this->getJson('/api/v1/state', ['X-Init-Data' => $this->initData()])->assertOk();
        Player::query()->update(['level' => 5]);
        $this->getJson('/api/v1/state', ['X-Init-Data' => $this->initData()])->assertOk();
    }

    public function test_resources_accrue_over_time(): void
    {
        Carbon::setTestNow('2026-10-03 10:00:00');
        $this->playerAtLevel5();

        // 1 soat onlayn qolmasdan: 5 daqiqa onlayn (20/soat) + 55 daqiqa oflayn (×0.7)
        Carbon::setTestNow('2026-10-03 11:00:00');
        $res = $this->getJson('/api/v1/state', ['X-Init-Data' => $this->initData()])->assertOk();

        $this->assertEqualsWithDelta(20 * 0.4 / 12 + 14 * 0.4 * 55 / 60, $res->json('data.economy.buf.stone'), 1e-3);
        $this->assertEqualsWithDelta(0.25, $res->json('data.economy.res.water'), 1e-3); // gʻor 1: 0.25/soat
        $this->assertSame(3600, $res->json('data.away.seconds'));
        $this->assertSame(5, $res->json('data.away.gained.stone'));
        $this->assertSame(0, $res->json('data.resources.stone')); // hali buferda

        // Darhol qayta soʻrov — oflayn emas, away yoʻq
        $this->getJson('/api/v1/state', ['X-Init-Data' => $this->initData()])->assertJsonPath('data.away', null);
        Carbon::setTestNow();
    }

    public function test_collect_moves_buffer_to_storage(): void
    {
        $this->playerAtLevel5();
        PlayerResource::query()->update(['buf_stone' => 12.5, 'buf_wood' => 3, 'stone' => 100]);

        $this->postJson('/api/v1/buildings/collect', [], ['X-Init-Data' => $this->initData()])
            ->assertOk()
            ->assertJsonPath('data.collected.stone', 12)
            ->assertJsonPath('data.collected.wood', 3)
            ->assertJsonPath('state.resources.stone', 112);

        $res = PlayerResource::query()->first();
        $this->assertEqualsWithDelta(0.5, (float) $res->buf_stone, 0.01);
    }

    public function test_collect_requires_workshop(): void
    {
        $this->postJson('/api/v1/buildings/collect', [], ['X-Init-Data' => $this->initData()])
            ->assertStatus(400)
            ->assertJsonPath('error.code', 'BUILDING_LOCKED');
    }

    public function test_allocation_is_validated_and_saved(): void
    {
        $this->playerAtLevel5();
        $headers = ['X-Init-Data' => $this->initData()];

        $this->postJson('/api/v1/profile/allocation', ['stone' => 50, 'wood' => 30, 'hide' => 15, 'bone' => 15], $headers)
            ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION');
        $this->postJson('/api/v1/profile/allocation', ['stone' => '40', 'wood' => 30, 'hide' => 15, 'bone' => 15], $headers)
            ->assertStatus(422);

        $this->postJson('/api/v1/profile/allocation', ['stone' => 70, 'wood' => 10, 'hide' => 10, 'bone' => 10], $headers)
            ->assertOk()
            ->assertJsonPath('state.economy.alloc.stone', 70);
        $this->assertSame(70, (int) PlayerResource::query()->value('alloc_stone'));
    }

    public function test_unknown_api_route_uses_error_envelope(): void
    {
        $this->getJson('/api/v1/nope')->assertStatus(404)->assertJsonPath('error.code', 'NOT_FOUND');
    }
}
