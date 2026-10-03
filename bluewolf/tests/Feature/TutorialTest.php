<?php

namespace Tests\Feature;

use App\Models\Army;
use App\Models\Player;
use App\Models\PlayerResource;
use App\Models\Queue;
use App\Services\TutorialService;
use App\Support\Formula;
use App\Support\TelegramInitData;
use Database\Seeders\GameConfigSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TutorialTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = '123456:TEST-token';

    protected function setUp(): void
    {
        parent::setUp();
        config(['bluewolf.bot_token' => self::TOKEN]);
        $this->seed(GameConfigSeeder::class);
    }

    /** @return array<string, string> */
    private function headers(): array
    {
        return ['X-Init-Data' => TelegramInitData::sign(['auth_date' => time(), 'user' => json_encode(['id' => 42, 'first_name' => 'Alfa'])], self::TOKEN)];
    }

    public function test_steps_match_gdd_levels(): void
    {
        $cfg = json_decode(file_get_contents(base_path('public/data/game_config.json')), true);
        $steps = TutorialService::data()['steps'];
        $this->assertCount(23, $steps);
        $this->assertSame(330, array_sum(array_column($steps, 'xp')));
        $xp = 0;
        foreach ($steps as $i => $s) {
            $this->assertSame($i + 1, $s['id']);
            // Har qadam uchun kerakli daraja oldingi qadamlar XP si bilan yetiladi
            $this->assertGreaterThanOrEqual(Formula::totalXp($cfg, $s['level']), $xp, "qadam {$s['id']}");
            $xp += $s['xp'];
            $this->assertNotEmpty($s['title']);
            $this->assertNotEmpty($s['text']);
        }
        $this->assertSame(Formula::totalXp($cfg, 5), 280);
    }

    public function test_full_walkthrough_reaches_level_5(): void
    {
        $h = $this->headers();
        $this->getJson('/api/v1/state', $h)->assertOk()
            ->assertJsonPath('data.player.tutorial_step', 0)
            ->assertJsonPath('data.player.tutorial_total', 23);

        $this->postJson('/api/v1/tutorial/step', ['step' => 2], $h)->assertStatus(422); // ketma-ket
        $this->postJson('/api/v1/tutorial/skip', [], $h)->assertStatus(422);              // hali erta

        foreach (range(1, 23) as $step) {
            $res = $this->postJson('/api/v1/tutorial/step', ['step' => $step], $h)->assertOk();
            if ($step === 5) {
                $res->assertJsonPath('data.levels.0', 2)->assertJsonPath('state.player.level', 2);
            }
            if ($step === 9) {
                $this->assertEqualsWithDelta(40, (float) PlayerResource::query()->value('buf_stone'), 0.01);
            }
        }
        $p = Player::query()->first();
        $this->assertSame(5, $p->level);
        $this->assertEqualsWithDelta(330, $p->xp, 0.001);
        $this->assertSame(2, (int) Army::query()->where('role', 'hunter')->value('alive'));
        $this->postJson('/api/v1/tutorial/step', ['step' => 24], $h)->assertStatus(422);
    }

    public function test_tutorial_rules_xp_only_from_steps_and_instant_queues(): void
    {
        $h = $this->headers();
        $this->getJson('/api/v1/state', $h)->assertOk();
        $this->postJson('/api/v1/hunt/solo', [], $h)->assertOk();
        $this->assertEqualsWithDelta(0, (float) Player::query()->value('xp'), 0.001); // ovdan XP yoʻq

        foreach (range(1, 5) as $s) {
            $this->postJson('/api/v1/tutorial/step', ['step' => $s], $h)->assertOk();
        }
        PlayerResource::query()->update(['stone' => 500, 'wood' => 500, 'bone' => 500]);
        $q = $this->postJson('/api/v1/buildings/upgrade', ['type' => 'workshop'], $h)->assertOk()->json('data.queue');
        $this->assertSame($q['started_at'], $q['ends_at']); // darhol
        $this->getJson('/api/v1/state', $h)->assertJsonPath('data.finished.0.kind', 'build');
        $this->assertSame('done', Queue::query()->value('state'));
    }

    public function test_skip_after_step_12_gives_remaining_xp(): void
    {
        $h = $this->headers();
        $this->getJson('/api/v1/state', $h)->assertOk();
        foreach (range(1, 12) as $s) {
            $this->postJson('/api/v1/tutorial/step', ['step' => $s], $h)->assertOk();
        }
        $stone = (float) PlayerResource::query()->value('stone');
        $this->postJson('/api/v1/tutorial/skip', [], $h)->assertOk()->assertJsonPath('data.xp', 260);
        $p = Player::query()->first();
        $this->assertSame(5, $p->level);
        $this->assertSame(23, $p->tutorial_step);
        $this->assertSame($stone, (float) PlayerResource::query()->value('stone')); // resurs mukofotlari berilmaydi
    }
}
