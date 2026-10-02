<?php

namespace Tests\Feature;

use App\Models\Building;
use App\Models\Player;
use App\Support\TelegramInitData;
use Database\Seeders\GameConfigSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = '123456:TEST-token';

    protected function setUp(): void
    {
        parent::setUp();
        config(['bluewolf.bot_token' => self::TOKEN, 'bluewolf.dev_auth' => false]);
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
            ->assertJsonPath('data.version', '0.0.0');
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
        $this->seed(GameConfigSeeder::class);

        $this->getJson('/api/v1/config')
            ->assertOk()
            ->assertJsonPath('data.params.xp_base', 80)
            ->assertJsonPath('data.params.hunter_yield_mult', 5);
    }

    public function test_unknown_api_route_uses_error_envelope(): void
    {
        $this->getJson('/api/v1/nope')->assertStatus(404)->assertJsonPath('error.code', 'NOT_FOUND');
    }
}
