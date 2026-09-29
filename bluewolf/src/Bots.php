<?php
declare(strict_types=1);

namespace BlueWolf;

/**
 * NPC toʻdalar ("yovvoyi toʻdalar"). Kichik serverda matchmaking havzasini toʻldiradi
 * (Sozlamalar: "Minimal havza 10") va 4–6 darajadagi oʻyinchilarga (real oʻyinchilar
 * qalqon ostida) jang imkonini beradi. Bot janglari mavsum hissasiga kirmaydi.
 */
final class Bots
{
    public const TUTORIAL_NAME = 'Mashq boʻrisi';
    private const TG_BASE = 9000000000000;
    private const ADJ = ['Kulrang', 'Qora', 'Oq', 'Choʻl', 'Togʻ', 'Tun', 'Qoya', 'Dasht', 'Yovvoyi', 'Sovuq', 'Qizil', 'Kumush'];
    private const NOUN = ['Toʻda', 'Panja', 'Tish', 'Soya', 'Shamol', 'Izquvar', 'Yirtqich', 'Uvlovchi', 'Qoʻriqchi', 'Daydi'];

    /** Recommended taqsimot (GDD bo'lim 6): razvedkachi 20% · himoyachi 20% · ovchi 15% · hujumchi qoldiq. */
    public static function composition(int $level): array
    {
        $cap = F::armyCap($level);
        if ($level < Config::int('pack_unlock_level')) {
            return [['role' => 'hunter', 'tier' => 1, 'qty' => $cap]];
        }
        $tier = F::maxTier('attacker', $level, $level);
        $scout = (int) round($cap * Config::get('share_scout'));
        $def = (int) round($cap * Config::get('share_defender'));
        $hunter = max(1, (int) round($cap * Config::get('share_hunter')));
        $att = max(0, $cap - $scout - $def - $hunter);
        $out = [];
        foreach (['scout' => $scout, 'attacker' => $att, 'defender' => $def, 'hunter' => $hunter] as $role => $n) {
            if ($n > 0) {
                $out[] = ['role' => $role, 'tier' => $tier, 'qty' => $n];
            }
        }
        return $out;
    }

    public static function ensurePool(int $now): int
    {
        $created = 0;
        $max = Config::int('max_level');
        for ($lvl = 1; $lvl <= $max; $lvl++) {
            $have = (int) Db::val('SELECT COUNT(*) FROM players WHERE is_bot = 1 AND level = ? AND display_name <> ?',
                [$lvl, self::TUTORIAL_NAME]);
            for ($i = $have; $i < Config::int('bots_per_level'); $i++) {
                self::create($lvl, self::ADJ[array_rand(self::ADJ)] . ' ' . self::NOUN[array_rand(self::NOUN)], $now);
                $created++;
            }
        }
        if (self::tutorialBot() === null) {
            self::create(Config::int('pack_unlock_level'), self::TUTORIAL_NAME, $now, true);
            $created++;
        }
        return $created;
    }

    public static function tutorialBot(): ?int
    {
        $id = Db::val('SELECT id FROM players WHERE is_bot = 1 AND display_name = ?', [self::TUTORIAL_NAME]);
        return $id === null ? null : (int) $id;
    }

    private static function create(int $level, string $name, int $now, bool $tutorial = false): int
    {
        return Db::tx(function () use ($level, $name, $now, $tutorial) {
            $n = (int) Db::val('SELECT COUNT(*) FROM players WHERE is_bot = 1');
            [$x, $y] = Game::randomSpot();
            $pid = Db::insert('players', [
                'tg_id' => self::TG_BASE + $n + 1, 'display_name' => $name, 'level' => $level,
                'xp' => F::xpTotal($level), 'x' => $x, 'y' => $y, 'is_bot' => 1,
                'tutorial_step' => Config::int('tutorial_steps'), 'free_speedups' => 0,
                'created_at' => Db::dt($now), 'last_seen_at' => Db::dt($now),
            ]);
            Game::initEconomy($pid, $now, self::stock($level), max(1, $level - 1));
            Db::exec("UPDATE buildings SET level = ? WHERE player_id = ? AND type = 'den'", [$level, $pid]);
            $groups = $tutorial ? [['role' => 'hunter', 'tier' => 1, 'qty' => 1]] : self::composition($level);
            foreach ($groups as $g) {
                Db::insert('army', ['player_id' => $pid, 'role' => $g['role'], 'tier' => $g['tier'], 'alive' => $g['qty']]);
            }
            return $pid;
        });
    }

    /** Botning "toʻliq" zaxirasi: 3 kunlik goʻsht + 8 soatlik ustaxona ishlab chiqarishi. */
    public static function stock(int $level): array
    {
        $ws = F::workshopRate(max(1, $level - 1)) * 8 / 4;
        return ['meat' => round(F::meatNeed($level) * F::armyCap($level) * Config::get('reserve_days') + 5, 2),
            'stone' => round($ws, 2), 'wood' => round($ws, 2), 'hide' => round($ws, 2), 'bone' => round($ws, 2)];
    }

    /**
     * Bot tiklanishi: zaxira toʻliq qiymatga qadar vaqt bilan tiklanadi (1 soatda toʻliq),
     * qoʻshin oxirgi jangdan 1 soat oʻtgach toʻliq tarkibga qaytadi.
     */
    public static function refresh(array &$ctx, int $at): void
    {
        $lvl = $ctx['p']['level'];
        $from = Db::ts($ctx['r']['last_tick_at']);
        $k = min(1.0, max(0.0, ($at - $from) / Config::get('bot_regen_sec')));
        foreach (self::stock($lvl) as $res => $full) {
            if ($ctx['r'][$res] < $full) {
                $ctx['r'][$res] += ($full - $ctx['r'][$res]) * $k;
            }
        }
        $ctx['r']['last_tick_at'] = Db::dt(max($at, $from));
        $ctx['p']['hunger_since'] = null;
        $last = Db::val('SELECT MAX(created_at) FROM battles WHERE defender_id = ?', [$ctx['p']['id']]);
        if ($last === null || $at - Db::ts($last) >= Config::get('bot_regen_sec')) {
            if ($ctx['p']['display_name'] === self::TUTORIAL_NAME) {
                return;
            }
            foreach ($ctx['army'] as &$a) {
                $a['alive'] = 0;
                $a['injured'] = 0;
            }
            unset($a);
            foreach (self::composition($lvl) as $g) {
                Game::unit($ctx, $g['role'], $g['tier'])['alive'] = $g['qty'];
            }
        }
    }
}
