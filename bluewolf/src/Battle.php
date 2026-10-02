<?php
declare(strict_types=1);

namespace BlueWolf;

/**
 * Jang hisobi (GDD bo'lim 7) — sof funksiya, bazaga tegmaydi.
 *
 *   EP = Σ(askar × tier CP × qarshi-kuch koeff.)
 *   R  = hujumchi EP ÷ himoyachi EP
 *   Hujumchi yoʻqotishi  = MIN(90%, 40% ÷ R) × (1 ± 10%)
 *   Himoyachi yoʻqotishi = MIN(90%, 40% × R) × (1 ± 10%)
 */
final class Battle
{
    /**
     * @param array $att  ['groups' => [[role,tier,qty]...], 'level' => int, 'hungry' => bool]
     * @param array $def  ['groups' => [...], 'level' => int, 'hungry' => bool, 'alpha_cp' => float]
     * @param bool  $trap Razvedkasiz hujumda tuzoqqa tushdimi
     * @param callable|null $rand fn(): float in [0,1) — testlar uchun
     */
    public static function resolve(array $att, array $def, bool $trap, ?callable $rand = null): array
    {
        $rand ??= static fn(): float => mt_rand() / (mt_getrandmax() + 1);
        $var = Config::get('battle_variance');

        $attEp = self::ep($att['groups'], $att['level'], $def['groups'], $def['level'], $att['hungry'] ?? false);
        $defEp = self::ep($def['groups'], $def['level'], $att['groups'], $att['level'], $def['hungry'] ?? false)
            + ($def['alpha_cp'] ?? 0.0) * (($def['hungry'] ?? false) ? 1 - Config::get('hunger_cp_penalty') : 1);
        $defEp = max($defEp, 1.0);
        $r = $attEp / $defEp;

        $base = Config::get('battle_base_loss');
        $max = Config::get('battle_max_loss');
        $attLoss = min($max, $base / max($r, 1e-9)) * (1 + $var * (2 * $rand() - 1));
        if ($trap) {
            $attLoss *= 1 + Config::get('trap_damage');
        }
        $defLoss = min($max, $base * $r) * (1 + $var * (2 * $rand() - 1));
        $attLoss = max(0.0, min($max, $attLoss));
        $defLoss = max(0.0, min($max, $defLoss));

        $win = Config::get('battle_win_ratio');
        $result = $r >= $win ? 'attacker_win' : ($r <= 1 / $win ? 'defender_win' : 'draw');
        $full = $result === 'attacker_win' && $r >= Config::get('battle_full_win_ratio');

        $attLost = self::split($att['groups'], $attLoss, Config::get('att_death_share'));
        $defLost = self::split($def['groups'], $defLoss, Config::get('def_death_share'));

        $attDamage = self::lostEp($defLost, $def['level']); // hujumchi yetkazgan zarar
        $defDamage = self::lostEp($attLost, $att['level']);

        return [
            'ep_attacker' => (int) round($attEp),
            'ep_defender' => (int) round($defEp),
            'ratio' => round($r, 3),
            'result' => $result,
            'full_win' => $full,
            'att_loss_pct' => round($attLoss, 4),
            'def_loss_pct' => round($defLoss, 4),
            'att_losses' => $attLost,
            'def_losses' => $defLost,
            'att_damage' => (int) round($attDamage),
            'def_damage' => (int) round($defDamage),
            'trap' => $trap,
            'log' => self::log($attEp, $defEp, $attLoss, $defLoss, $result, $trap, $att['groups'], $def['groups']),
        ];
    }

    /** Guruhlar EP si; qarshi-kuch koeff. raqib tarkibining EP ulushi boʻyicha oʻrtachalanadi. */
    public static function ep(array $groups, int $level, array $enemy, int $enemyLevel, bool $hungry): float
    {
        $enemyShare = [];
        $enemyTotal = 0.0;
        foreach ($enemy as $g) {
            $e = $g['qty'] * F::tierCp($g['role'], (int) $g['tier'], $enemyLevel);
            $enemyShare[$g['role']] = ($enemyShare[$g['role']] ?? 0) + $e;
            $enemyTotal += $e;
        }
        $sum = 0.0;
        foreach ($groups as $g) {
            $k = 1.0;
            if ($enemyTotal > 0) {
                $k = 0.0;
                foreach ($enemyShare as $role => $e) {
                    $k += F::counter($g['role'], $role) * $e / $enemyTotal;
                }
            }
            $sum += $g['qty'] * F::tierCp($g['role'], (int) $g['tier'], $level) * $k;
        }
        if ($hungry) {
            $sum *= 1 - Config::get('hunger_cp_penalty');
        }
        return $sum;
    }

    /**
     * Yoʻqotishni tierlar boʻyicha proporsional taqsimlash (eng katta qoldiq usuli).
     * @return array{dead: array, injured: array}
     */
    public static function split(array $groups, float $lossPct, float $deathShare): array
    {
        $total = 0;
        foreach ($groups as $g) {
            $total += $g['qty'];
        }
        $target = (int) round($total * $lossPct);
        $rows = [];
        $assigned = 0;
        foreach ($groups as $i => $g) {
            $exact = $g['qty'] * $lossPct;
            $rows[$i] = ['g' => $g, 'n' => (int) floor($exact), 'frac' => $exact - floor($exact)];
            $assigned += $rows[$i]['n'];
        }
        uasort($rows, static fn($a, $b) => $b['frac'] <=> $a['frac']);
        foreach ($rows as $i => $r) {
            if ($assigned >= $target) {
                break;
            }
            if ($rows[$i]['n'] < $r['g']['qty']) {
                $rows[$i]['n']++;
                $assigned++;
            }
        }
        ksort($rows);
        $dead = [];
        $injured = [];
        foreach ($rows as $r) {
            if ($r['n'] <= 0) {
                continue;
            }
            $d = (int) round($r['n'] * $deathShare);
            $base = ['role' => $r['g']['role'], 'tier' => (int) $r['g']['tier']];
            if ($d > 0) {
                $dead[] = $base + ['qty' => $d];
            }
            if ($r['n'] - $d > 0) {
                $injured[] = $base + ['qty' => $r['n'] - $d];
            }
        }
        return ['dead' => $dead, 'injured' => $injured];
    }

    private static function lostEp(array $losses, int $level): float
    {
        $s = 0.0;
        foreach (array_merge($losses['dead'], $losses['injured']) as $g) {
            $s += $g['qty'] * F::tierCp($g['role'], $g['tier'], $level);
        }
        return $s;
    }

    /** Klient animatsiyasi uchun raund jurnali: har raundda tomonlar qolgan kuchi (%). */
    private static function log(float $attEp, float $defEp, float $attLoss, float $defLoss,
                                string $result, bool $trap, array $attG, array $defG): array
    {
        $rounds = Config::int('battle_rounds');
        $retreat = Config::get('battle_retreat');
        $log = [['round' => 0, 'event' => $trap ? 'trap' : 'approach', 'att' => 100, 'def' => 100]];
        // 1-raund toʻqnashuv — 20%, 2–3 raund — asosiy jang 35%+35%, 4-raund — 10%
        $shares = [1 => 0.2, 2 => 0.35, 3 => 0.35, 4 => 0.1];
        $a = 1.0;
        $d = 1.0;
        for ($i = 1; $i < $rounds; $i++) {
            $a -= $attLoss * ($shares[$i] ?? 0);
            $d -= $defLoss * ($shares[$i] ?? 0);
            $event = $i === 1 ? 'clash' : ($i === $rounds - 1 ? 'decisive' : 'melee');
            if ($i === $rounds - 1 && min($a, $d) < $retreat) {
                $event = $a < $d ? 'att_retreat' : 'def_retreat';
            }
            $log[] = ['round' => $i, 'event' => $event, 'att' => (int) round($a * 100), 'def' => (int) round($d * 100)];
        }
        $log[] = ['round' => $rounds, 'event' => $result, 'att' => (int) round($a * 100), 'def' => (int) round($d * 100)];
        return $log;
    }
}
