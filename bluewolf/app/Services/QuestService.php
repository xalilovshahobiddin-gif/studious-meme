<?php

namespace App\Services;

use App\Models\GameConfig;
use App\Models\Player;
use App\Models\PlayerQuest;
use App\Support\QuestFormula;
use Carbon\CarbonImmutable;

/**
 * Vazifalar (GDD bo'lim 14): kundalik / haftalik / oylik vazifalar va sandiqlar, 7 kunlik kirish taqvimi,
 * kun kombosi. Mukofot faqat resurs (qurilish resurslari + goʻsht, Oziq gʻori sigʻimigacha).
 */
class QuestService
{
    public const PERIODS = ['d', 'w', 'm'];

    private const CHEST = ['d' => 'quest_daily_chest', 'w' => 'quest_weekly_chest', 'm' => 'quest_monthly_chest'];

    /**
     * Joriy davr vazifalari bazada boʻlmasa — yaratadi (daraja shu paytdagisi bilan qotadi).
     *
     * @return array<string, int> davr → kalit
     */
    public function ensure(Player $player, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();
        $keys = [];
        foreach (self::PERIODS as $period) {
            $key = QuestFormula::period($cfg, $period, (float) $now->getTimestampMs())['key'];
            $keys[$period] = $key;
            if ($player->quests()->where(['period' => $period, 'period_key' => $key])->exists()) {
                continue;
            }
            $quests = QuestFormula::questsFor($cfg, $player->id, $player->level, $period, $key);
            foreach ($quests as $q) {
                $player->quests()->create([
                    'period' => $period, 'period_key' => $key, 'quest_key' => $q['key'], 'metric' => $q['metric'],
                    'target' => $q['target'], 'reward' => $q['reward'],
                ]);
            }
            $player->quests()->create([
                'period' => $period, 'period_key' => $key, 'quest_key' => 'chest', 'metric' => 'chest', 'target' => count($quests),
            ]);
        }

        return $keys;
    }

    /** Harakatni sanash: joriy davrlardagi shu metrikali (olinmagan) vazifalar oʻsadi, maqsaddan oshmaydi. */
    public function track(Player $player, string $metric, float $amount = 1, ?CarbonImmutable $now = null): void
    {
        if ($amount <= 0) {
            return;
        }
        $keys = $this->ensure($player, $now);
        foreach ($keys as $period => $key) {
            $player->quests()->where(['period' => $period, 'period_key' => $key, 'metric' => $metric])->whereNull('claimed_at')
                ->get()->each(function (PlayerQuest $q) use ($amount) {
                    $q->progress = min($q->target, round($q->progress + $amount, 2));
                    $q->save();
                });
        }
    }

    /** Kunning birinchi kirishi — “login” vazifalari uchun. */
    public function trackLogin(Player $player, ?CarbonImmutable $now = null): void
    {
        $now ??= CarbonImmutable::now();
        $day = QuestFormula::period(GameConfig::allValues(), 'd', (float) $now->getTimestampMs())['key'];
        if ($player->login_day_key === $day) {
            return;
        }
        $player->login_day_key = $day;
        $player->save();
        $this->track($player, 'login', 1, $now);
    }

    /**
     * Vazifa yoki sandiq mukofotini olish.
     *
     * @return array{reward: array<string, int>, lost: float}
     */
    public function claim(Player $player, int $id, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();
        $keys = $this->ensure($player, $now);
        $q = $player->quests()->whereKey($id)->first();
        if ($q === null || $q->period_key !== $keys[$q->period]) {
            throw new GameException('NOT_FOUND', 'Vazifa topilmadi yoki muddati oʻtgan', 404);
        }
        if ($q->claimed_at !== null) {
            throw new GameException('QUEUE_BUSY', 'Mukofot allaqachon olingan', 409);
        }
        if ($q->progress < $q->target) {
            throw new GameException('VALIDATION', 'Vazifa hali bajarilmagan', 422);
        }

        if ($q->quest_key === 'chest') {
            $share = $cfg[self::CHEST[$q->period]];
            if ($q->period === 'd') {
                $player->combo_streak = $player->combo_day_key === $keys['d'] - 1 ? $player->combo_streak + 1 : 1;
                $player->combo_day_key = $keys['d'];
                $player->save();
                $share *= QuestFormula::comboMult($cfg, $player->combo_streak);
            }
            $q->reward = QuestFormula::reward($cfg, $player->level, $share);
        }
        if (PlayerQuest::query()->whereKey($q->id)->whereNull('claimed_at')->update(['claimed_at' => $now->format('Y-m-d H:i:s.v'), 'reward' => json_encode($q->reward)]) !== 1) {
            throw new GameException('QUEUE_BUSY', 'Mukofot allaqachon olingan', 409);
        }
        if ($q->quest_key !== 'chest') {
            $player->quests()->where(['period' => $q->period, 'period_key' => $q->period_key, 'quest_key' => 'chest'])->increment('progress');
        }

        return ['reward' => $q->reward, 'lost' => $this->grant($player, $q->reward)];
    }

    /**
     * 7 kunlik kirish sovgʻasi: kun oʻtkazib yuborilsa 1-kundan boshlanadi.
     *
     * @return array{day: int, reward: array<string, int>, lost: float}
     */
    public function claimLogin(Player $player, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();
        $today = QuestFormula::period($cfg, 'd', (float) $now->getTimestampMs())['key'];
        if ($player->login_claimed_key === $today) {
            throw new GameException('QUEUE_BUSY', 'Bugungi sovgʻa olingan', 409);
        }
        $day = $player->login_claimed_key === $today - 1 ? $player->login_streak % 7 + 1 : 1;
        $player->forceFill(['login_claimed_key' => $today, 'login_streak' => $day])->save();
        $reward = QuestFormula::reward($cfg, $player->level, $cfg['login_gift_step'] * $day);

        return ['day' => $day, 'reward' => $reward, 'lost' => $this->grant($player, $reward)];
    }

    /**
     * Klient uchun: davrlar, vazifalar, sandiqlar, kirish taqvimi, kun kombosi.
     *
     * @return array<string, mixed>
     */
    public function state(Player $player, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();
        $ms = (float) $now->getTimestampMs();
        $keys = $this->ensure($player, $now);
        $rows = $player->quests()->where(function ($q) use ($keys) {
            foreach ($keys as $period => $key) {
                $q->orWhere(fn ($w) => $w->where(['period' => $period, 'period_key' => $key]));
            }
        })->orderBy('id')->get();

        $today = $keys['d'];
        $comboNow = in_array($player->combo_day_key, [$today, $today - 1], true) ? $player->combo_streak : 0;
        $comboNext = $player->combo_day_key === $today ? $player->combo_streak : $comboNow + 1;
        $loginNext = $player->login_claimed_key === $today ? $player->login_streak
            : ($player->login_claimed_key === $today - 1 ? $player->login_streak % 7 + 1 : 1);

        $out = [];
        foreach (self::PERIODS as $period) {
            $set = $rows->where('period', $period);
            $chest = $set->firstWhere('quest_key', 'chest');
            $share = $cfg[self::CHEST[$period]] * ($period === 'd' ? QuestFormula::comboMult($cfg, $comboNext) : 1);
            $out[$period] = [
                'key' => $keys[$period],
                'ends_at' => QuestFormula::period($cfg, $period, $ms)['ends_at'],
                'quests' => $set->where('quest_key', '!=', 'chest')->values()->map(fn (PlayerQuest $q) => $this->row($q, $cfg))->all(),
                'chest' => [
                    'id' => $chest->id, 'target' => $chest->target, 'progress' => (int) $chest->progress, 'claimed' => $chest->claimed_at !== null,
                    'reward' => $chest->claimed_at !== null ? $chest->reward : QuestFormula::reward($cfg, $player->level, $share),
                ],
            ];
        }
        $out['login'] = [
            'day' => $loginNext,
            'claimed_today' => $player->login_claimed_key === $today,
            'gifts' => array_map(fn ($n) => QuestFormula::reward($cfg, $player->level, $cfg['login_gift_step'] * $n), range(1, 7)),
        ];
        $out['combo'] = ['streak' => $comboNow, 'next' => $comboNext, 'mult' => QuestFormula::comboMult($cfg, $comboNext), 'max_days' => (int) $cfg['quest_combo_max_days']];

        return $out;
    }

    /** @return array<string, mixed> */
    private function row(PlayerQuest $q, array $cfg): array
    {
        [, , $title, $desc] = QuestFormula::CATALOG[$q->quest_key];

        return [
            'id' => $q->id, 'key' => $q->quest_key, 'title' => $title, 'desc' => str_replace('{n}', (string) $q->target, $desc),
            'target' => $q->target, 'progress' => (int) floor($q->progress), 'reward' => $q->reward, 'claimed' => $q->claimed_at !== null,
        ];
    }

    /**
     * Resurslarni berish: qurilish resurslari omborga (cheklanmagan), goʻsht — Oziq gʻori sigʻimigacha.
     *
     * @param  array<string, int>  $reward
     * @return float sigʻmagan goʻsht
     */
    private function grant(Player $player, array $reward): float
    {
        $res = $player->resources;
        $lost = 0.0;
        foreach ($reward as $k => $v) {
            if ($k === 'meat') {
                $cave = (int) ($player->buildings()->where('type', 'food_cave')->value('level') ?? 0);
                $cap = EconomyService::caveCap(GameConfig::allValues(), $cave);
                $cur = (float) $res->meat;
                $res->meat = max($cur, min($cap, $cur + $v));
                $lost = $v - ((float) $res->meat - $cur);
            } else {
                $res->{$k} = (float) $res->{$k} + $v;
            }
        }
        $res->save();

        return round($lost, 2);
    }
}
