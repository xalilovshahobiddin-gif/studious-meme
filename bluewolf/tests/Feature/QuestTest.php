<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\PlayerQuest;
use App\Models\PlayerResource;
use App\Support\QuestFormula;
use App\Support\TelegramInitData;
use Database\Seeders\GameConfigSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class QuestTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = '123456:TEST-token';

    protected function setUp(): void
    {
        parent::setUp();
        config(['bluewolf.bot_token' => self::TOKEN]);
        $this->seed(GameConfigSeeder::class);
        Carbon::setTestNow('2026-10-05 06:00:00'); // dushanba, 11:00 Toshkent
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** @return array<string, string> */
    private function headers(): array
    {
        return ['X-Init-Data' => TelegramInitData::sign(['auth_date' => time(), 'user' => json_encode(['id' => 42, 'first_name' => 'Alfa'])], self::TOKEN)];
    }

    /** @return array<string, float> */
    private function cfg(): array
    {
        return json_decode(file_get_contents(base_path('public/data/game_config.json')), true);
    }

    public function test_formulas_match_client(): void
    {
        $fx = json_decode(file_get_contents(base_path('tests/fixtures/quest_cases.json')), true);
        foreach ($fx['periods'] as $c) {
            $this->assertSame($c['result'], QuestFormula::period($this->cfg(), $c['period'], $c['now']));
        }
        foreach ($fx['quests'] as $c) {
            $this->assertEquals($c['quests'], QuestFormula::questsFor($this->cfg(), $c['player'], $c['level'], $c['period'], $c['key']));
        }
        foreach ($fx['rewards'] as $c) {
            $this->assertSame($c['reward'], QuestFormula::reward($this->cfg(), $c['level'], $c['share']));
        }
    }

    public function test_rewards_are_resources_only_and_within_budget(): void
    {
        $cfg = $this->cfg();
        foreach ([1, 5, 10, 25] as $level) {
            foreach (['d', 'w', 'm'] as $p) {
                foreach (QuestFormula::questsFor($cfg, 7, $level, $p, 100) as $q) {
                    $this->assertEmpty(array_diff(array_keys($q['reward']), ['stone', 'wood', 'hide', 'bone', 'meat']));
                }
            }
        }
        // GDD bo'lim 14: 5-daraja, bitta kundalik vazifa ≈ 40 resurs
        $r = QuestFormula::reward($cfg, 5, $cfg['quest_daily_cap'] / $cfg['quest_daily_count']);
        $this->assertSame(40, $r['stone'] + $r['wood'] + $r['hide'] + $r['bone']);
        // Vazifalar goʻshti toʻdani toʻliq boqmaydi
        $this->assertLessThan(QuestFormula::dailyMeat($cfg, 10), array_sum(array_column(array_column(QuestFormula::questsFor($cfg, 7, 10, 'd', 100), 'reward'), 'meat')) * 3);
    }

    public function test_state_tracks_actions_and_claims(): void
    {
        $h = $this->headers();
        $state = $this->getJson('/api/v1/quests', $h)->assertOk()->json('data');
        $this->assertCount(2, $state['d']['quests']); // 1-daraja: faqat ov va goʻsht vazifalari
        $this->assertSame(['hunt', 'meat'], array_column($state['d']['quests'], 'key'));
        $this->assertSame(1, $state['w']['quests'][array_search('login', array_column($state['w']['quests'], 'key'))]['progress']);

        // Yolgʻiz ov ×3 — “Ovchi” bajariladi
        foreach (range(1, 3) as $i) {
            $this->postJson('/api/v1/hunt/solo', [], $h)->assertOk();
            Carbon::setTestNow(now()->addMinutes(2));
        }
        $quests = collect($this->getJson('/api/v1/quests', $h)->json('data.d.quests'))->keyBy('key');
        $this->assertSame(3, $quests['hunt']['progress']);
        $this->assertSame(1, $quests['meat']['progress']); // 3 × 0.5 kg = 1.5 → maqsad 1 da toʻxtaydi

        $this->postJson('/api/v1/quests/claim', ['id' => $quests['hunt']['id']], $h)->assertOk()
            ->assertJsonPath('data.reward.stone', $quests['hunt']['reward']['stone']);
        $this->postJson('/api/v1/quests/claim', ['id' => $quests['hunt']['id']], $h)->assertStatus(409);
        $chest = $this->getJson('/api/v1/quests', $h)->json('data.d.chest');
        $this->assertSame(1, $chest['progress']);
        $this->postJson('/api/v1/quests/claim', ['id' => $chest['id']], $h)->assertStatus(422);

        $this->postJson('/api/v1/quests/claim', ['id' => $quests['meat']['id']], $h)->assertOk();
        $stone = (float) PlayerResource::query()->value('stone');
        $res = $this->postJson('/api/v1/quests/claim', ['id' => $chest['id']], $h)->assertOk();
        $this->assertSame(1, Player::query()->value('combo_streak'));
        $this->assertEqualsWithDelta($stone + $res->json('data.reward.stone'), (float) PlayerResource::query()->value('stone'), 0.01);
    }

    public function test_daily_combo_grows_on_consecutive_days_and_resets(): void
    {
        $h = $this->headers();
        $claimChest = function () use ($h) {
            $id = $this->getJson('/api/v1/quests', $h)->json('data.d.chest.id');
            PlayerQuest::query()->where('period', 'd')->update(['progress' => \DB::raw('target')]);

            return $this->postJson('/api/v1/quests/claim', ['id' => $id], $h)->assertOk()->json('data.reward.stone');
        };
        $s1 = $claimChest();
        Carbon::setTestNow(now()->addDay());
        $s2 = $claimChest();
        $this->assertSame(2, Player::query()->value('combo_streak'));
        $this->assertGreaterThan($s1, $s2); // ×1.1
        $this->assertEqualsWithDelta(1.1, $this->getJson('/api/v1/quests', $h)->json('data.combo.mult'), 1e-9);

        Carbon::setTestNow(now()->addDays(2)); // bir kun oʻtkazib yuborildi
        $this->assertSame(0, $this->getJson('/api/v1/quests', $h)->json('data.combo.streak'));
        $claimChest();
        $this->assertSame(1, Player::query()->value('combo_streak'));
    }

    public function test_login_gift_calendar(): void
    {
        $h = $this->headers();
        $this->postJson('/api/v1/quests/login', [], $h)->assertOk()->assertJsonPath('data.day', 1);
        $this->postJson('/api/v1/quests/login', [], $h)->assertStatus(409);
        Carbon::setTestNow(now()->addDay());
        $this->postJson('/api/v1/quests/login', [], $h)->assertOk()->assertJsonPath('data.day', 2);
        $this->assertSame(2, $this->getJson('/api/v1/quests', $h)->json('data.w.quests.'.array_search('login', array_column($this->getJson('/api/v1/quests', $h)->json('data.w.quests'), 'key')).'.progress'));
        Carbon::setTestNow(now()->addDays(2));
        $this->postJson('/api/v1/quests/login', [], $h)->assertOk()->assertJsonPath('data.day', 1);
    }

    public function test_new_period_gives_new_quests(): void
    {
        $h = $this->headers();
        $d1 = $this->getJson('/api/v1/quests', $h)->json('data.d');
        Carbon::setTestNow(now()->addDay());
        $d2 = $this->getJson('/api/v1/quests', $h)->json('data.d');
        $this->assertSame($d1['key'] + 1, $d2['key']);
        $this->assertNotSame($d1['chest']['id'], $d2['chest']['id']);
        $this->postJson('/api/v1/quests/claim', ['id' => $d1['quests'][0]['id']], $h)->assertStatus(404); // eski kun
    }
}
