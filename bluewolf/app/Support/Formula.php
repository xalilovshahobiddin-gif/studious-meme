<?php

namespace App\Support;

/**
 * GDD formulalari (askar, ov, daraja). Klientdagi public/js/game.js bilan bir xil —
 * ikkalasi tests/fixtures/army_cases.json bilan tekshiriladi.
 *
 * @phpstan-type Cfg array<string, float>
 */
class Formula
{
    /** Oziqlanish varagʻi: daraja → asosiy oʻlja [nomi, kg] (Excel “Oziqlanish”, qoʻlda sozlanadigan ustun). */
    public const PREY = [
        1 => ['Kemiruvchi', 0.5], 2 => ['Qush', 1], 3 => ['Quyon', 2], 4 => ['Sugʻur', 8], 5 => ['Jayron', 25],
        6 => ['Jayron', 25], 7 => ['Yovvoyi choʻchqa', 50], 8 => ['Yovvoyi choʻchqa', 50], 9 => ['Kiyik', 60],
        10 => ['Kiyik', 60], 11 => ['Bugʻu', 100], 12 => ['Bugʻu', 100], 13 => ['Arxar', 120], 14 => ['Arxar', 120],
        15 => ['Yovvoyi ot', 250], 16 => ['Yovvoyi ot', 250], 17 => ['Los', 300], 18 => ['Los', 300], 19 => ['Bizon', 500],
        20 => ['Mamont bolasi', 800], 21 => ['Mamont', 1200], 22 => ['Ruh oʻljasi', 400], 23 => ['Ruh oʻljasi', 400],
        24 => ['Ruh oʻljasi', 400], 25 => ['Ruh oʻljasi', 400],
    ];

    /** Rol → mashq binosi. */
    public const ROLE_BUILDING = ['scout' => 'scout_rock', 'attacker' => 'battle_ground', 'defender' => 'defense_wall', 'hunter' => 'hunt_path'];

    public static function stage(array $cfg, int $level): float
    {
        return match (true) {
            $level <= 4 => $cfg['stage_early'],
            $level <= $cfg['stage_mid_level'] => $cfg['stage_mid'],
            $level <= $cfg['stage_late_level'] => $cfg['stage_normal'],
            default => $cfg['stage_late'],
        };
    }

    public static function levelCost(array $cfg, int $level): int
    {
        if ($level <= 1) {
            return 0;
        }

        return (int) (round($cfg['xp_base'] * $cfg['xp_growth'] ** ($level - 2) * self::stage($cfg, $level) / 10) * 10);
    }

    /** $level darajaga yetish uchun jami XP. */
    public static function totalXp(array $cfg, int $level): int
    {
        $sum = 0;
        for ($i = 2; $i <= $level; $i++) {
            $sum += self::levelCost($cfg, $i);
        }

        return $sum;
    }

    /** Toʻda hajmi: baza + chiziqli × n + kvadrat × n², n = daraja − toʻda ochilish darajasi (GDD bo'lim 1). */
    public static function armyCap(array $cfg, int $level): int
    {
        if ($level < $cfg['pack_unlock_level']) {
            return (int) $cfg['pack_solo_size'];
        }

        return (int) self::jsRound(self::armyRaw($cfg, $level));
    }

    private static function armyRaw(array $cfg, int $level): float
    {
        $n = $level - $cfg['pack_unlock_level'];

        return $cfg['pack_base'] + $cfg['pack_lin'] * $n + $cfg['pack_quad'] * $n * $n;
    }

    /**
     * Askar birligi: toʻda hajmi ÷ muvozanat egri chizigʻi (baza × pack_growth^n).
     * Bitta askarning ehtiyoji, narxi, mashq vaqti va ov unumi shunga boʻlinadi — jami balans oʻzgarmaydi.
     */
    public static function unitScale(array $cfg, int $level): float
    {
        if ($level < $cfg['pack_unlock_level']) {
            return 1.0;
        }

        return self::armyRaw($cfg, $level) / ($cfg['pack_base'] * $cfg['pack_growth'] ** ($level - $cfg['pack_unlock_level']));
    }

    public static function maxTier(array $cfg, int $level, int $buildingLevel): int
    {
        return max(1, min(6, intdiv($level, (int) $cfg['tier_step_level']), intdiv($buildingLevel, (int) $cfg['tier_step_building'])));
    }

    /** Bitta askarning kunlik goʻshti, kg. */
    public static function need(array $cfg, int $level): float
    {
        return ($cfg['need_base'] + $cfg['need_growth'] * ($level - 1)) / self::unitScale($cfg, $level);
    }

    /** Bitta askarning kunlik suvi. */
    public static function waterNeed(array $cfg, int $level): float
    {
        return ($cfg['water_need_base'] + $cfg['water_need_growth'] * ($level - 1)) / self::unitScale($cfg, $level);
    }

    /** Bitta ovchining unumi, kg/soat. */
    public static function hunterYield(array $cfg, int $level, int $tier): float
    {
        return $cfg['hunter_yield_mult'] * self::need($cfg, $level) * (1 + $cfg['hunter_tier_bonus'] * ($tier - 1));
    }

    /** Rol binosining askar sigʻimi (bino darajasidagi askar birligi bilan). */
    public static function roleCap(array $cfg, int $buildingLevel): float
    {
        return $cfg['role_cap_base'] * $cfg['role_cap_growth'] ** ($buildingLevel - 1) * self::unitScale($cfg, $buildingLevel);
    }

    /**
     * Bitta yangi askar narxi: goʻsht va suyak, har tierda × tier_coef², askar birligiga boʻlinadi (GDD bo'lim 6).
     *
     * @return array{meat: int, bone: int}
     */
    public static function trainCost(array $cfg, int $tier, int $level): array
    {
        $mult = $cfg['tier_coef'] ** (2 * ($tier - 1)) / self::unitScale($cfg, $level);

        return [
            'meat' => max(1, (int) self::jsRound($cfg['train_meat_base'] * $mult)),
            'bone' => max(1, (int) self::jsRound($cfg['train_bone_base'] * $mult)),
        ];
    }

    /**
     * Bitta askar mashqi, soniya (GDD bo'lim 6 “Qoʻshin toʻlganligi”):
     * tier vaqti × MIN(5, bino jazosi × toʻlganlik koeff.) ÷ (mashq tezligi × In koeff.)
     */
    public static function trainSeconds(array $cfg, int $tier, int $playerLevel, int $buildingLevel, int $armyTotal, int $roleTotal): float
    {
        $cap = self::armyCap($cfg, $playerLevel);
        $fill = $cap > 0 ? $armyTotal / $cap : 1;
        $occupancy = max(0.5, ($fill / 0.6) ** $cfg['occupancy_exp']);
        $penalty = min($cfg['role_cap_penalty_max'], max(1, ($roleTotal / self::roleCap($cfg, $buildingLevel)) ** $cfg['role_cap_penalty_exp']));
        $speed = (1 + $cfg['train_speed_per_level'] * ($buildingLevel - 1)) * (1 + $cfg['den_speed_coef'] * ($playerLevel - 1));
        $minutes = $cfg['train_time_min'] * $cfg['tier_coef'] ** ($tier - 1) * min($cfg['train_coef_max'], $penalty * $occupancy) / $speed / self::unitScale($cfg, $playerLevel);

        return $minutes * 60;
    }

    /* ---- Shifo gʻori (GDD bo'lim 5 “Shifo gʻori”). Klient: public/js/game.js — natija bir xil. ---- */

    /** Bir vaqtda davolanadigan boʻrilar (askar birligining shu bino darajasigacha eng kattasi bilan); 0 — qurilmagan. */
    public static function hospitalCap(array $cfg, int $buildingLevel): int
    {
        if ($buildingLevel < 1) {
            return 0;
        }

        return max(1, (int) self::jsRound(($cfg['hospital_cap_base'] + $cfg['hospital_cap_growth'] * ($buildingLevel - 1)) * self::unitPeak($cfg, $buildingLevel)));
    }

    /** Askar birligining shu darajagacha eng kattasi — sigʻim kuchaytirishda hech qachon kamaymasligi uchun. */
    public static function unitPeak(array $cfg, int $level): float
    {
        $peak = 1.0;
        for ($l = 1; $l <= $level; $l++) {
            $peak = max($peak, self::unitScale($cfg, $l));
        }

        return $peak;
    }

    /** Bitta boʻrini davolash vaqti, daqiqa. */
    public static function healMinutes(array $cfg, int $buildingLevel): float
    {
        return $cfg['heal_time_min'] / (1 + $cfg['heal_speed_growth'] * (max(1, $buildingLevel) - 1));
    }

    /** Bitta boʻrini davolash narxi, shifobaxsh oʻt (askar birligiga boʻlinadi). */
    public static function healHerb(array $cfg, int $tier, int $level): float
    {
        return self::round2($cfg['heal_herb_per_tier'] * $tier / self::unitScale($cfg, $level));
    }

    /**
     * Davolash rejasi: jami boʻri, oʻt, vaqt (daqiqa) va toʻlqinlar soni.
     * Boʻrilar sigʻim boʻyicha toʻlqin-toʻlqin davolanadi: vaqt = toʻlqinlar × bitta boʻri vaqti.
     *
     * @param  array<string, array<int|string, int>>  $troops  rol → [tier => soni]
     * @return array{qty: int, herb: float, minutes: float, waves: int, cap: int}
     */
    public static function healPlan(array $cfg, int $buildingLevel, int $level, array $troops): array
    {
        $qty = 0;
        $herb = 0.0;
        foreach ($troops as $tiers) {
            foreach ($tiers as $tier => $n) {
                $qty += (int) $n;
                $herb += (int) $n * self::healHerb($cfg, (int) $tier, $level);
            }
        }
        $cap = self::hospitalCap($cfg, $buildingLevel);
        $waves = $cap > 0 ? (int) ceil($qty / $cap) : 0;

        return ['qty' => $qty, 'herb' => self::round2($herb), 'minutes' => self::round2($waves * self::healMinutes($cfg, $buildingLevel)), 'waves' => $waves, 'cap' => $cap];
    }

    /* ---- Ov xaritasi (GDD bo'lim 4 “Ov xaritasi”). Klient: public/js/game.js — natija bir xil. ---- */

    /** 32-bit butun koʻpaytma (JS Math.imul) — natija 0..2^32-1. */
    public static function imul(int $a, int $b): int
    {
        $a &= 0xFFFFFFFF;
        $b &= 0xFFFFFFFF;
        $lo = ($a & 0xFFFF) * ($b & 0xFFFF);
        $mid = ((($a >> 16) * ($b & 0xFFFF)) + (($a & 0xFFFF) * ($b >> 16))) & 0xFFFF;

        return ($lo + ($mid << 16)) & 0xFFFFFFFF;
    }

    /**
     * mulberry32 tasodifiy sonlar generatori [0, 1).
     *
     * @return \Closure(): float
     */
    public static function rng(int $seed): \Closure
    {
        $a = $seed & 0xFFFFFFFF;

        return function () use (&$a): float {
            $a = ($a + 0x6D2B79F5) & 0xFFFFFFFF;
            $t = self::imul($a ^ ($a >> 15), 1 | $a);
            $t = (($t + self::imul($t ^ ($t >> 7), 61 | $t)) & 0xFFFFFFFF) ^ $t;

            return (($t ^ ($t >> 14)) & 0xFFFFFFFF) / 4294967296;
        };
    }

    /** Ov xaritasi davri: har hunt_board_refresh_h soatda yangisi. */
    public static function huntWindow(array $cfg, float $nowMs): int
    {
        return (int) floor($nowMs / ($cfg['hunt_board_refresh_h'] * 3600000));
    }

    /** Oʻyinchi + davr → urugʻ (har oʻyinchida har xil kartalar). */
    public static function huntSeed(int $playerId, int $window): int
    {
        return self::imul($playerId + 1, 2654435761) ^ self::imul($window + 7, 40503);
    }

    /** Oʻljaga kerakli eng kam boʻri (askar birligi bilan). */
    public static function minPack(array $cfg, int $level, float $preyKg): int
    {
        return max(1, (int) ceil(self::round2($preyKg / $cfg['prey_kg_per_wolf'] * self::unitScale($cfg, $level))));
    }

    /** Tavsiya etilgan ovchilar soni (qoʻshinning share_hunter qismi, kamida 1). */
    public static function huntersRec(array $cfg, int $level): int
    {
        return max(1, (int) round(self::armyCap($cfg, $level) * $cfg['share_hunter']));
    }

    /**
     * 9 ta ov kartasi: 3 yaqin (xavfsiz), 3 oʻrta, 3 uzoq (xavfli, oʻlja koʻproq);
     * vaqt boʻyicha (keyin poda hajmi) oʻsish tartibida, slot = tartib raqami.
     *
     * @return list<array<string, mixed>>
     */
    public static function huntBoard(array $cfg, int $playerId, int $level, int $window): array
    {
        $r = self::rng(self::huntSeed($playerId, $window));
        $bands = [[$cfg['hunt_km_min'], $cfg['hunt_km_near_max']], [$cfg['hunt_km_near_max'], $cfg['hunt_km_mid_max']], [$cfg['hunt_km_mid_max'], $cfg['hunt_km_far_max']]];
        $bonus = [0, $cfg['hunt_mid_bonus'], $cfg['hunt_far_bonus']];
        $injury = [0, $cfg['hunt_mid_injury'], $cfg['hunt_far_injury']];
        $death = [0, $cfg['hunt_mid_death'], $cfg['hunt_far_death']];
        $cards = [];
        for ($i = 0; $i < 9; $i++) {
            $band = intdiv($i, 3);
            $km = self::round1($bands[$band][0] + $r() * ($bands[$band][1] - $bands[$band][0]));
            $minutes = (int) self::jsRound($cfg['hunt_base_min'] + 2 * $km / $cfg['hunt_speed_kmh'] * 60);
            [$prey, $preyKg] = self::PREY[max(1, min(25, $level - 1 + $band))];
            $base = self::huntersRec($cfg, $level) * self::hunterYield($cfg, $level, 1) * $minutes / 60 * (1 + $bonus[$band]);
            $count = max(1, (int) self::jsRound($base * ($cfg['hunt_herd_min'] + $r() * $cfg['hunt_herd_spread']) / $preyKg));
            $cards[] = [
                'band' => $band, 'prey' => $prey, 'prey_kg' => $preyKg, 'count' => $count, 'herd_kg' => self::round2($count * $preyKg),
                'km' => $km, 'minutes' => $minutes, 'bonus' => $bonus[$band], 'injury' => $injury[$band], 'death' => $death[$band],
                'min_pack' => self::minPack($cfg, $level, $preyKg),
            ];
        }
        usort($cards, fn ($a, $b) => [$a['minutes'], $a['herd_kg'], $a['km']] <=> [$b['minutes'], $b['herd_kg'], $b['km']]);
        foreach ($cards as $i => &$card) {
            $card['slot'] = $i;
            // Kam → koʻp: keyingi kartadagi poda oldingisidan kichik boʻlmaydi
            if ($i > 0 && $card['herd_kg'] < $cards[$i - 1]['herd_kg']) {
                $card['count'] = (int) ceil($cards[$i - 1]['herd_kg'] / $card['prey_kg'] - 1e-9);
                $card['herd_kg'] = self::round2($card['count'] * $card['prey_kg']);
            }
        }
        unset($card);

        return $cards;
    }

    /**
     * Kartadagi ov natijasi. Goʻsht podadan oshmaydi.
     *
     * @param  array<string, mixed>  $card
     * @param  array<string, array<int, int>>  $payload  rol → [tier => soni]
     * @return array{meat: float, herb: float, xp: float, min_pack: int, sent: int, penalty: bool}
     */
    public static function huntResult(array $cfg, int $level, array $card, array $payload): array
    {
        $kg = 0.0;
        $sent = 0;
        foreach ($payload as $role => $tiers) {
            foreach ($tiers as $tier => $qty) {
                $sent += $qty;
                if ($role === 'hunter') {
                    $kg += $qty * self::hunterYield($cfg, $level, (int) $tier) * $card['minutes'] / 60 * (1 + $card['bonus']);
                }
            }
        }
        $penalty = $sent < $card['min_pack'];
        if ($penalty) {
            $kg *= $cfg['hunt_small_party_penalty'];
        }
        $kg = min($kg, $card['herd_kg']);

        return [
            'meat' => self::round2($kg),
            'herb' => self::round2($kg * $cfg['hunt_herb_share']),
            'xp' => self::round2($kg * $cfg['xp_hunt_coef']),
            'min_pack' => $card['min_pack'],
            'sent' => $sent,
            'penalty' => $penalty,
        ];
    }

    /** JS Math.round bilan bir xil (yarim — yuqoriga). */
    public static function jsRound(float $x): float
    {
        return floor($x + 0.5);
    }

    private static function round1(float $x): float
    {
        return self::jsRound($x * 10) / 10;
    }

    private static function round2(float $x): float
    {
        return self::jsRound($x * 100) / 100;
    }
}
