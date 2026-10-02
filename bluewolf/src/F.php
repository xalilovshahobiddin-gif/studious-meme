<?php
declare(strict_types=1);

namespace BlueWolf;

/**
 * Sof formulalar (GDD). Bazaga tegmaydi, barcha raqamlar Config dan.
 * Testlar Excel jadvaliga solishtirib tekshiradi (tests/FormulasTest.php).
 */
final class F
{
    public const ROLES = ['scout', 'attacker', 'defender', 'hunter'];
    public const TIERS = 6;
    public const BUILDINGS = ['den', 'food_cave', 'workshop', 'scout_rock', 'battle_ground',
        'defense_wall', 'hunt_path', 'hospital', 'market'];
    /** Rol → mashq binosi */
    public const ROLE_BUILDING = [
        'scout' => 'scout_rock', 'attacker' => 'battle_ground',
        'defender' => 'defense_wall', 'hunter' => 'hunt_path',
    ];
    /** Qarshi-kuch uchburchagi: kalit rol ustun keladigan rol. */
    public const BEATS = ['defender' => 'attacker', 'attacker' => 'scout', 'scout' => 'defender'];
    public const WORKSHOP_RES = ['stone', 'wood', 'bone'];

    private static function c(string $k): float
    {
        return Config::get($k);
    }

    /** Bosqich koeffitsienti: 1–4 erta · 5–10 oʻrta · 11–15 normal · 16+ kech. */
    public static function stage(int $level): float
    {
        if ($level <= Config::int('pack_unlock_level')) {
            return self::c('stage_early');
        }
        if ($level <= Config::int('stage_mid_level')) {
            return self::c('stage_mid');
        }
        if ($level <= Config::int('stage_late_level')) {
            return 1.0;
        }
        return self::c('stage_late');
    }

    // ------------------------------------------------------------ binolar

    /** Bino narxining bazaviy qismi (1→2 daraja) resurslar boʻyicha. */
    public static function buildingBaseCost(string $type): array
    {
        switch ($type) {
            case 'food_cave':
                return ['stone' => self::c('bld_food_cave_stone'), 'wood' => self::c('bld_food_cave_wood')];
            case 'workshop':
                return ['stone' => self::c('bld_workshop_stone'), 'wood' => self::c('bld_workshop_wood'),
                    'bone' => self::c('bld_workshop_bone')];
            case 'scout_rock':
            case 'battle_ground':
            case 'defense_wall':
            case 'hunt_path':
                $k = self::c("bld_{$type}_coef");
                return ['stone' => self::c('bld_field_stone') * $k, 'bone' => self::c('bld_field_bone') * $k,
                    'meat' => self::c('bld_field_meat') * $k];
            case 'hospital':
                return ['wood' => self::c('bld_hospital_wood'), 'meat' => self::c('bld_hospital_meat'),
                    'stone' => self::c('bld_hospital_stone')];
            case 'market':
                return ['stone' => self::c('bld_market_stone'), 'wood' => self::c('bld_market_wood')];
        }
        throw new ApiError('BAD_REQUEST', "Nomaʼlum bino: $type");
    }

    /** Narx(L) = bazaviy × 1.30^(L-2) × bosqich(L). L — yangi daraja. */
    public static function buildingCost(string $type, int $toLevel): array
    {
        $mult = self::c('cost_growth') ** ($toLevel - 2) * self::stage($toLevel);
        $out = [];
        foreach (self::buildingBaseCost($type) as $res => $base) {
            $out[$res] = (int) round($base * $mult);
        }
        return $out;
    }

    /** Vaqt(L) = 10 daq × bino koeff. × 1.25^(L-2) × bosqich(L), soniyada. */
    public static function buildingTime(string $type, int $toLevel): int
    {
        $min = self::c('build_time_base_min') * self::c("time_$type")
            * self::c('time_growth') ** ($toLevel - 2) * self::stage($toLevel);
        return (int) round($min * 60);
    }

    /** Toʻda masshtabi (sql/005): qoʻshin va unga bogʻliq sigʻimlar shuncha marta katta. */
    public static function armyScale(): float
    {
        return self::c('army_scale');
    }

    /** Oziq gʻori sigʻimi: Excel qiymati × toʻda masshtabi (ombor 3 kunlik ozuqani sigʻdirsin). */
    public static function foodCap(int $l): float
    {
        return self::c('store_base') * self::c('store_growth') ** ($l - 1) * self::armyScale();
    }

    public static function protection(int $l): float
    {
        return min(self::c('protect_max'), self::c('protect_base') + self::c('protect_growth') * ($l - 1));
    }

    /** Ustaxona ishlab chiqarishi, birlik/soat */
    public static function workshopRate(int $l): float
    {
        return self::c('prod_base') * self::c('prod_growth') ** ($l - 1);
    }

    public static function workshopCap(int $l): float
    {
        return self::workshopRate($l) * self::c('workshop_store_hours');
    }

    public static function workshopSlots(int $l): int
    {
        return Config::int('workshop_slot_base') + intdiv($l, 3);
    }

    public static function roleCap(int $l): float
    {
        return self::c('role_cap_base') * self::c('role_cap_growth') ** ($l - 1) * self::armyScale();
    }

    public static function trainSpeed(int $bldLevel): float
    {
        return 1 + self::c('train_speed_bonus') * ($bldLevel - 1);
    }

    /** In (den) tezlanish koeffitsienti — oʻyinchi darajasiga ergashadi. */
    public static function denCoef(int $playerLevel): float
    {
        return 1 + self::c('den_speed_coef') * ($playerLevel - 1);
    }

    public static function healCap(int $l): int
    {
        return (int) floor((self::c('heal_cap_base') + self::c('heal_cap_growth') * ($l - 1)) * self::armyScale());
    }

    /** Bitta boʻrini davolash vaqti, soniya */
    public static function healTime(int $l): int
    {
        return (int) round(self::c('heal_time_min') * 60 / (1 + self::c('heal_speed_growth') * ($l - 1)));
    }

    // ------------------------------------------------------------ oʻyinchi

    /** Qoʻshin sigʻimi: Excel jadvali × toʻda masshtabi. 1–3 daraja yolgʻiz bosqich — 1 ta. */
    public static function armyCap(int $level): int
    {
        $base = (int) Config::level($level)['army'];
        return $level < Config::int('pack_unlock_level') ? $base : (int) round($base * self::armyScale());
    }

    /** Bir askarning kunlik goʻsht ehtiyoji, kg */
    public static function meatNeed(int $level): float
    {
        return self::c('need_base') + self::c('need_growth') * ($level - 1);
    }


    /** Daraja uchun jami XP (shu darajaga yetish uchun). */
    public static function xpTotal(int $level): int
    {
        return (int) Config::level($level)['xp_total'];
    }

    public static function levelForXp(int $xp): int
    {
        $max = Config::int('max_level');
        $lvl = 1;
        for ($l = 2; $l <= $max; $l++) {
            if ($xp >= self::xpTotal($l)) {
                $lvl = $l;
            }
        }
        return $lvl;
    }

    // ------------------------------------------------------------ askarlar

    public static function roleUnlock(string $role): int
    {
        return $role === 'hunter' ? Config::int('role_hunter_unlock') : Config::int('pack_unlock_level');
    }

    /**
     * Maks tier = MIN(6, alfa ÷ 4, rol binosi ÷ 4). Rol ochilgach 1-tier doim mavjud
     * (aks holda tanishtiruvdagi birinchi ovchi/hujumchi mashqi imkonsiz boʻlardi).
     */
    public static function maxTier(string $role, int $level, int $bldLevel): int
    {
        if ($level < self::roleUnlock($role)) {
            return 0;
        }
        $t = min(self::TIERS, intdiv($level, Config::int('tier_step_level')),
            intdiv($bldLevel, Config::int('tier_step_building')));
        return max(1, $t);
    }

    public static function tierCp(string $role, int $tier, int $alphaLevel): float
    {
        $base = self::c("role_{$role}_power") * self::c('cp_w_power')
            + self::c("role_{$role}_speed") * self::c('cp_w_speed')
            + self::c("role_{$role}_hp") * self::c('cp_w_hp');
        return $base * self::c('tier_coef') ** ($tier - 1) * (1 + self::c('alpha_bonus') * $alphaLevel);
    }

    /** Yangi askar narxi (bitta): goʻsht va suyak. Narx kuch nisbatining kvadrati bilan oʻsadi. */
    public static function trainCost(int $tier): array
    {
        $m = self::c('tier_coef') ** (2 * ($tier - 1));
        return ['meat' => (int) round(self::c('train_meat_base') * $m),
            'bone' => (int) round(self::c('train_bone_base') * $m)];
    }

    /** Bitta askar bazaviy mashq vaqti, soniya */
    public static function trainTime(int $tier): float
    {
        // Bitta askar vaqti masshtabga boʻlinadi — toʻdani toʻldirish vaqti Excel'dagidek qoladi
        return self::c('train_time_min') * 60 * self::c('tier_coef') ** ($tier - 1) / self::armyScale();
    }

    /** Qoʻshin toʻlganligi koeffitsienti: (toʻlganlik ÷ 60%)^1.8, [0.5; 3.0] */
    public static function occupancyCoef(float $occ): float
    {
        $k = ($occ / self::c('occupancy_normal')) ** self::c('occupancy_exp');
        return max(self::c('occupancy_min'), min(self::c('occupancy_max'), $k));
    }

    /** Bino jazosi = (askar ÷ bino sigʻimi)^2, [1; 5] */
    public static function buildingPenalty(int $soldiers, float $cap): float
    {
        $k = ($soldiers / max(1.0, $cap)) ** self::c('role_penalty_exp');
        return max(1.0, min(self::c('role_penalty_max'), $k));
    }

    /** Almashtirish: 1 ta yuqori tier uchun kerakli past tier askar. */
    public static function promoteNeed(int $fromTier, int $toTier): float
    {
        return self::c('tier_coef') ** ($toTier - $fromTier) * (1 + self::c('promote_loss'));
    }

    public static function carry(int $tier): float
    {
        return self::c('carry_base') * (1 + self::c('carry_tier_bonus') * $tier);
    }

    public static function counter(string $mine, string $theirs): float
    {
        if ((self::BEATS[$mine] ?? null) === $theirs) {
            return self::c('counter_bonus');
        }
        if ((self::BEATS[$theirs] ?? null) === $mine) {
            return self::c('counter_weak');
        }
        return 1.0;
    }

    // ------------------------------------------------------------ PvP

    public static function lootDiffCoef(int $diff): float
    {
        $diff = max(-3, min(3, $diff));
        $key = $diff === 0 ? 'loot_diff_0' : ($diff < 0 ? 'loot_diff_m' . (-$diff) : 'loot_diff_p' . $diff);
        return self::c($key);
    }

    public static function repeatCoef(int $nth): float
    {
        return self::c('loot_repeat_' . max(1, min(4, $nth)));
    }

    public static function marchSeconds(float $km, bool $scout = false): int
    {
        return (int) max(1, round($km / self::c($scout ? 'scout_speed' : 'march_speed') * 3600));
    }

    /**
     * Ov oʻljasi: [goʻsht, suyak]. Toʻda talab qiladigan oʻljada toʻda podani ovlaydi — goʻsht × masshtab;
     * yolgʻiz ov (kemiruvchi, qush, quyon) oʻzgarmaydi. Ortiqcha ovchilar bonus beradi.
     */
    public static function huntYield(array $prey, int $extraHunterTiers): array
    {
        $meat = $prey['kg'] * ($prey['pack'] > 1 ? self::armyScale() : 1.0)
            * (1 + self::c('hunt_hunter_bonus') * $extraHunterTiers);
        return ['meat' => round($meat, 2), 'bone' => round($meat * self::c('hunt_bone_ratio'), 2)];
    }

    /** Ov davomiyligi, soniya */
    public static function huntSeconds(float $kg): int
    {
        return (int) round(self::c('hunt_base_sec') + self::c('hunt_sec_per_kg') * $kg);
    }

    /** Tezlashtirish narxi (oy toshi): bugun ishlatilgan soniyadan keyingi `sec` uchun, progressiv bloklar. */
    public static function speedupPrice(int $usedSec, int $sec): int
    {
        $block = (int) round(self::c('speedup_block_h') * 3600);
        $price = 0.0;
        $pos = $usedSec;
        $end = $usedSec + $sec;
        while ($pos < $end) {
            $i = intdiv($pos, $block);
            $blockEnd = ($i + 1) * $block;
            $chunk = min($end, $blockEnd) - $pos;
            // blok narxi butungacha yaxlitlanadi (GDD jadvali: 10 · 16 · 26 · 41 · 66 · 105)
            $price += round(self::c('speedup_base_price') * self::c('speedup_price_growth') ** $i) * $chunk / $block;
            $pos += $chunk;
        }
        return (int) ceil($price);
    }

    public static function speedupDailyCap(): int
    {
        return (int) round(86400 * self::c('speedup_daily_cap'));
    }

    /** Oʻyinchining kunlik ishlab chiqarishi (vazifa mukofoti byudjeti uchun). */
    public static function dailyProduction(int $workshopLevel): float
    {
        return self::workshopRate($workshopLevel) * 24;
    }
}
