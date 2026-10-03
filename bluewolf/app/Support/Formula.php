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

    public static function armyCap(array $cfg, int $level): int
    {
        if ($level < $cfg['pack_unlock_level']) {
            return (int) $cfg['pack_solo_size'];
        }

        return (int) round($cfg['pack_base'] * $cfg['pack_growth'] ** ($level - $cfg['pack_unlock_level']));
    }

    public static function maxTier(array $cfg, int $level, int $buildingLevel): int
    {
        return max(1, min(6, intdiv($level, (int) $cfg['tier_step_level']), intdiv($buildingLevel, (int) $cfg['tier_step_building'])));
    }

    public static function need(array $cfg, int $level): float
    {
        return $cfg['need_base'] + $cfg['need_growth'] * ($level - 1);
    }

    /** Bitta ovchining unumi, kg/soat. */
    public static function hunterYield(array $cfg, int $level, int $tier): float
    {
        return $cfg['hunter_yield_mult'] * self::need($cfg, $level) * (1 + $cfg['hunter_tier_bonus'] * ($tier - 1));
    }

    /** Rol binosining askar sigʻimi. */
    public static function roleCap(array $cfg, int $buildingLevel): float
    {
        return $cfg['role_cap_base'] * $cfg['role_cap_growth'] ** ($buildingLevel - 1);
    }

    /**
     * Bitta yangi askar narxi: goʻsht va suyak, har tierda × tier_coef² (GDD bo'lim 6).
     *
     * @return array{meat: int, bone: int}
     */
    public static function trainCost(array $cfg, int $tier): array
    {
        $mult = $cfg['tier_coef'] ** (2 * ($tier - 1));

        return ['meat' => (int) round($cfg['train_meat_base'] * $mult), 'bone' => (int) round($cfg['train_bone_base'] * $mult)];
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
        $minutes = $cfg['train_time_min'] * $cfg['tier_coef'] ** ($tier - 1) * min($cfg['train_coef_max'], $penalty * $occupancy) / $speed;

        return $minutes * 60;
    }

    /**
     * Ov natijasi (GDD bo'lim 4).
     *
     * @param  array<string, array<int, int>>  $payload  rol → [tier => soni]
     * @return array{meat: float, herb: float, xp: float, min_pack: int, sent: int, penalty: bool}
     */
    public static function huntResult(array $cfg, int $level, array $payload): array
    {
        $kg = 0.0;
        $sent = 0;
        foreach ($payload as $role => $tiers) {
            foreach ($tiers as $tier => $qty) {
                $sent += $qty;
                if ($role === 'hunter') {
                    $kg += $qty * self::hunterYield($cfg, $level, (int) $tier) * $cfg['hunt_duration_min'] / 60;
                }
            }
        }
        $minPack = max(1, (int) ceil(self::PREY[$level][1] / $cfg['prey_kg_per_wolf']));
        $penalty = $sent < $minPack;
        if ($penalty) {
            $kg *= $cfg['hunt_small_party_penalty'];
        }

        return [
            'meat' => round($kg, 2),
            'herb' => round($kg * $cfg['hunt_herb_share'], 2),
            'xp' => round($kg * $cfg['xp_hunt_coef'], 2),
            'min_pack' => $minPack,
            'sent' => $sent,
            'penalty' => $penalty,
        ];
    }
}
