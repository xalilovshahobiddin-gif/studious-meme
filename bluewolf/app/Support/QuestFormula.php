<?php

namespace App\Support;

/**
 * Vazifalar (GDD bo'lim 14). Klientdagi public/js/game.js (questsFor, questReward, questPeriod)
 * bilan bir xil — tests/fixtures/quest_cases.json bilan tekshiriladi.
 * Mukofot faqat resurs: qurilish resurslari va goʻsht. Askar, XP, kuch — yoʻq.
 */
class QuestFormula
{
    /** key → [metric, minL, sarlavha, tavsif, maqsadlar] (tartib — koʻrsatish tartibi). */
    public const CATALOG = [
        'hunt' => ['hunt', 1, 'Ovchi', '{n} marta ovga chiq'],
        'meat' => ['meat', 1, 'Goʻsht zaxirasi', 'Ovdan {n} kg goʻsht keltir'],
        'build' => ['build', 2, 'Quruvchi', '{n} marta binoni kuchaytir'],
        'collect' => ['collect', 2, 'Yigʻuvchi', 'Ustaxona buferini {n} marta yigʻ'],
        'far' => ['hunt_far', 3, 'Uzoq yoʻl', 'Oʻrta yoki uzoq kartada {n} marta ovla'],
        'train' => ['train', 4, 'Murabbiy', '{n} ta askar tayyorla'],
        'login' => ['login', 1, 'Sodiq boʻri', '{n} kun oʻyinga kir'],
    ];

    private const SALT = ['d' => 1, 'w' => 2, 'm' => 3];

    /** @return array<string, int> davr → maqsad */
    public static function targets(array $cfg, string $key, int $level): array
    {
        $cap = Formula::armyCap($cfg, $level);
        $meat = self::dailyMeat($cfg, $level);

        return match ($key) {
            'hunt' => ['d' => 3, 'w' => 20, 'm' => 70],
            'meat' => ['d' => (int) ceil($meat * 0.5), 'w' => (int) ceil($meat * 3), 'm' => (int) ceil($meat * 12)],
            'build' => ['d' => 1, 'w' => 4, 'm' => 12],
            'collect' => ['d' => 2, 'w' => 10, 'm' => 35],
            'far' => ['d' => 1, 'w' => 5, 'm' => 15],
            'train' => ['d' => max(1, self::jsRound($cap * 0.1)), 'w' => max(2, self::jsRound($cap * 0.5)), 'm' => max(5, self::jsRound($cap * 1.5))],
            'login' => ['w' => 5, 'm' => 20],
        };
    }

    public static function dailyMeat(array $cfg, int $level): float
    {
        return Formula::need($cfg, $level) * Formula::armyCap($cfg, $level);
    }

    public static function dailyProd(array $cfg, int $level): float
    {
        return $cfg['prod_base'] * $cfg['prod_growth'] ** ($level - 1) * 24;
    }

    /**
     * Davr kaliti va tugash vaqti (ms), UTC + quest_tz_offset_h.
     *
     * @return array{key: int, ends_at: int}
     */
    public static function period(array $cfg, string $period, float $nowMs): array
    {
        $off = (int) ($cfg['quest_tz_offset_h'] * 3600000);
        $day = (int) floor(($nowMs + $off) / 86400000);
        if ($period === 'd') {
            return ['key' => $day, 'ends_at' => ($day + 1) * 86400000 - $off];
        }
        if ($period === 'w') {
            $w = (int) floor(($day + 3) / 7);

            return ['key' => $w, 'ends_at' => (($w + 1) * 7 - 3) * 86400000 - $off];
        }
        $d = (new \DateTimeImmutable('@'.intdiv((int) $nowMs + $off, 1000)))->setTimezone(new \DateTimeZone('UTC'));
        $y = (int) $d->format('Y');
        $m = (int) $d->format('n') - 1;
        $end = (new \DateTimeImmutable(sprintf('%04d-%02d-01 00:00:00', $m === 11 ? $y + 1 : $y, $m === 11 ? 1 : $m + 2), new \DateTimeZone('UTC')))->getTimestamp() * 1000;

        return ['key' => $y * 12 + $m, 'ends_at' => $end - $off];
    }

    /**
     * Mukofot: ulush × kunlik ishlab chiqarish (40/30/15/15) + goʻsht (ulush × koeff. × kunlik goʻsht ehtiyoji).
     *
     * @return array<string, int>
     */
    public static function reward(array $cfg, int $level, float $share): array
    {
        $p = self::dailyProd($cfg, $level) * $share;
        $out = [];
        foreach (['stone' => 0.4, 'wood' => 0.3, 'hide' => 0.15, 'bone' => 0.15] as $k => $part) {
            $v = self::jsRound($p * $part);
            if ($v > 0) {
                $out[$k] = $v;
            }
        }
        $meat = self::jsRound($share * $cfg['quest_meat_ratio'] * self::dailyMeat($cfg, $level));
        if ($meat > 0) {
            $out['meat'] = $meat;
        }

        return $out;
    }

    /**
     * Davr vazifalari: daraja boʻyicha ochiqlaridan oʻyinchi + davr urugʻi bilan tanlanadi.
     *
     * @return list<array{key: string, metric: string, title: string, desc: string, target: int, reward: array<string, int>}>
     */
    public static function questsFor(array $cfg, int $playerId, int $level, string $period, int $key): array
    {
        $count = (int) $cfg[['d' => 'quest_daily_count', 'w' => 'quest_weekly_count', 'm' => 'quest_monthly_count'][$period]];
        $cap = $cfg[['d' => 'quest_daily_cap', 'w' => 'quest_weekly_cap', 'm' => 'quest_monthly_cap'][$period]];
        $pool = [];
        foreach (self::CATALOG as $qk => [$metric, $minL]) {
            if ($level >= $minL && isset(self::targets($cfg, $qk, $level)[$period])) {
                $pool[] = $qk;
            }
        }
        $r = Formula::rng(Formula::imul($playerId + 1, 2246822519) ^ Formula::imul($key * 4 + self::SALT[$period], 3266489917));
        for ($i = count($pool) - 1; $i > 0; $i--) {
            $j = (int) floor($r() * ($i + 1));
            [$pool[$i], $pool[$j]] = [$pool[$j], $pool[$i]];
        }
        $order = array_flip(array_keys(self::CATALOG));
        $picked = array_slice($pool, 0, $count);
        usort($picked, fn ($a, $b) => $order[$a] <=> $order[$b]);

        return array_map(function (string $qk) use ($cfg, $level, $period, $cap, $count) {
            [$metric, , $title, $desc] = self::CATALOG[$qk];
            $n = self::targets($cfg, $qk, $level)[$period];

            return [
                'key' => $qk, 'metric' => $metric, 'title' => $title, 'desc' => str_replace('{n}', (string) $n, $desc),
                'target' => $n, 'reward' => self::reward($cfg, $level, $cap / $count),
            ];
        }, $picked);
    }

    /** Kun kombosi koeffitsienti. */
    public static function comboMult(array $cfg, int $streak): float
    {
        return 1 + $cfg['quest_combo_step'] * (min(max($streak, 1), (int) $cfg['quest_combo_max_days']) - 1);
    }

    private static function jsRound(float $x): int
    {
        return (int) floor($x + 0.5);
    }
}
