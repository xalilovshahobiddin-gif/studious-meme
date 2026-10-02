<?php
declare(strict_types=1);

namespace BlueWolf;

/**
 * Timestamp asosidagi resurs hisobi (texnik spec 4.1, GDD bo'lim 16).
 *
 * last_tick_at → to oraligʻi boʻlaklarga ajratiladi:
 *   - onlayn / oflayn chegarasi (oflaynda ishlab chiqarish 70%, ombor ×2),
 *   - goʻsht tugagan payt (undan keyin ochlik: ishlab chiqarish −50%).
 */
final class Economy
{
    public static function accrue(array &$ctx, int $to): void
    {
        $from = Db::ts($ctx['r']['last_tick_at']);
        if ($to <= $from) {
            return;
        }
        $onlineEnd = Db::ts($ctx['p']['last_seen_at']) + (int) round(Config::get('offline_after_min') * 60);
        $cuts = [$from];
        if ($onlineEnd > $from && $onlineEnd < $to) {
            $cuts[] = $onlineEnd;
        }
        $cuts[] = $to;
        for ($i = 0; $i < count($cuts) - 1; $i++) {
            self::segment($ctx, $cuts[$i], $cuts[$i + 1], $cuts[$i] >= $onlineEnd);
        }
        self::desertion($ctx, $to);
        $ctx['r']['last_tick_at'] = Db::dt($to);
    }

    /** Goʻsht sarfi, kg/soniya */
    public static function consumption(array $ctx): float
    {
        return F::meatNeed($ctx['p']['level']) * max(1, Game::soldiers($ctx)) / 86400;
    }

    private static function segment(array &$ctx, int $a, int $b, bool $offline): void
    {
        $c = self::consumption($ctx);
        if ($ctx['p']['hunger_since'] === null && $c > 0) {
            $tZero = $a + (int) floor($ctx['r']['meat'] / $c);
            if ($tZero < $b) {
                self::apply($ctx, $b - $a > 0 ? $tZero - $a : 0, $offline, false, $c);
                $ctx['r']['meat'] = 0.0;
                $ctx['p']['hunger_since'] = Db::dt($tZero);
                self::apply($ctx, $b - $tZero, $offline, true, $c);
                return;
            }
        }
        self::apply($ctx, $b - $a, $offline, $ctx['p']['hunger_since'] !== null, $c);
    }

    private static function apply(array &$ctx, int $dt, bool $offline, bool $hungry, float $c): void
    {
        if ($dt <= 0) {
            return;
        }
        $r = &$ctx['r'];
        $b = $ctx['b'];
        $r['meat'] = max(0.0, $r['meat'] - $c * $dt);

        $prodK = ($offline ? Config::get('offline_prod_rate') : 1.0) * ($hungry ? 1 - Config::get('hunger_prod_penalty') : 1.0);
        $storeK = $offline ? Config::get('offline_store_mult') : 1.0;

        // Ustaxona: soatlik ishlab chiqarish 4 resurs orasida taqsimot boʻyicha
        $add = F::workshopRate($b['workshop']) / 3600 * $dt * $prodK;
        $auto = (int) $ctx['p']['auto_collect'] === 1;
        if (!$auto) {
            $cap = F::workshopCap($b['workshop']) * $storeK;
            $have = 0.0;
            foreach (F::WORKSHOP_RES as $k) {
                $have += $r["ws_$k"];
            }
            $add = min($add, max(0.0, $cap - $have));
        }
        foreach (F::WORKSHOP_RES as $k) {
            $part = $add * ((int) $r["alloc_$k"]) / 100;
            if ($auto) {
                $r[$k] += $part;
            } else {
                $r["ws_$k"] += $part;
            }
        }
    }

    /** 7 kundan ortiq ochlikda askarlar asta ketadi: kuniga 1%, maksimum 50% (GDD bo'lim 16). */
    private static function desertion(array &$ctx, int $to): void
    {
        $since = $ctx['p']['hunger_since'];
        if ($since === null) {
            return;
        }
        $days = ($to - Db::ts($since)) / 86400 - Config::get('hunger_leave_after_d');
        if ($days <= 0) {
            return;
        }
        $target = min(Config::get('hunger_leave_max'), Config::get('hunger_leave_daily') * floor($days));
        $lost = (float) $ctx['p']['hunger_lost_pct'];
        if ($target <= $lost) {
            return;
        }
        $k = ($target - $lost) / (1 - $lost);
        foreach ($ctx['army'] as &$a) {
            $a['alive'] -= (int) floor($a['alive'] * $k);
        }
        unset($a);
        $ctx['p']['hunger_lost_pct'] = $target;
    }

    /** Goʻsht qoʻshilishi bilan ochlik jazolari darhol oʻchadi. */
    public static function fed(array &$ctx): void
    {
        if ($ctx['r']['meat'] > 0) {
            $ctx['p']['hunger_since'] = null;
            $ctx['p']['hunger_lost_pct'] = 0;
        }
    }
}
