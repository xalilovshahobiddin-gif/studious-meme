<?php
declare(strict_types=1);

namespace BlueWolf;

/** Navbatlar: qurilish, mashq, almashtirish, davolash (texnik spec 4.2). */
final class Queues
{
    /** Navbat tugashi — processEvents ichidan, oʻyinchi qulflangan. */
    public static function complete(array &$ctx, array $q, int $at): void
    {
        Db::exec("UPDATE queues SET state = 'done' WHERE id = ?", [$q['id']]);
        $pid = (int) $ctx['p']['id'];
        $qty = (int) $q['qty'];
        switch ($q['kind']) {
            case 'build':
                $type = $q['building_type'];
                $ctx['b'][$type] = max($ctx['b'][$type], (int) $q['target_level']);
                Game::addXp($ctx, self::xpFor(F::buildingCost($type, (int) $q['target_level'])), $at);
                Quests::bump($pid, 'build', 1, $at);
                $dur = Db::ts($q['ends_at']) - Db::ts($q['started_at']);
                if ($dur > 3600) {
                    Notify::push($pid, 'build_done', ['type' => $type, 'level' => (int) $q['target_level']], 2);
                }
                break;
            case 'train':
                Game::unit($ctx, $q['role'], (int) $q['tier'])['alive'] += $qty;
                $c = F::trainCost((int) $q['tier']);
                Game::addXp($ctx, self::xpFor(['bone' => $c['bone'] * $qty]), $at);
                Quests::bump($pid, 'train', $qty, $at);
                break;
            case 'promote':
                Game::unit($ctx, $q['role'], (int) $q['tier'])['alive'] += $qty;
                break;
            case 'heal':
                Game::unit($ctx, $q['role'], (int) $q['tier'])['alive'] += $qty;
                break;
        }
    }

    /** Qurilish/mashq XP = sarflangan asosiy resurs (tosh+yogʻoch+teri+suyak) × 0.02 */
    public static function xpFor(array $cost): float
    {
        $s = 0;
        foreach (F::WORKSHOP_RES as $k) {
            $s += $cost[$k] ?? 0;
        }
        return $s * Config::get('xp_build_coef');
    }

    /** Navbat narxi (bekor qilishda qaytarish uchun) — serverda qayta hisoblanadi. */
    public static function costOf(array $q): array
    {
        $qty = (int) $q['qty'];
        return match ($q['kind']) {
            'build' => F::buildingCost($q['building_type'], (int) $q['target_level']),
            'train' => array_map(static fn($v) => $v * $qty, F::trainCost((int) $q['tier'])),
            'promote' => array_map(static fn($v) => $v * $qty * Config::get('promote_cost_share'), F::trainCost((int) $q['tier'])),
            'heal' => ['meat' => F::trainCost((int) $q['tier'])['meat'] * Config::get('heal_meat_share') * $qty],
        };
    }

    public static function cancel(int $pid, int $qid, int $now): array
    {
        return Db::tx(function () use ($pid, $qid) {
            $ctx = Game::lock($pid);
            $q = Db::one("SELECT * FROM queues WHERE id = ? AND player_id = ? AND state = 'running' FOR UPDATE", [$qid, $pid]);
            if (!$q) {
                throw new ApiError('NOT_FOUND', 'Navbat topilmadi');
            }
            $refund = [];
            foreach (self::costOf($q) as $k => $v) {
                $refund[$k] = floor($v * Config::get('queue_cancel_refund'));
            }
            Game::give($ctx, $refund);
            if ($q['kind'] === 'promote') {
                $need = (int) ceil((int) $q['qty'] * F::promoteNeed((int) $q['from_tier'], (int) $q['tier']));
                Game::unit($ctx, $q['role'], (int) $q['from_tier'])['alive'] += $need;
            } elseif ($q['kind'] === 'heal') {
                Game::unit($ctx, $q['role'], (int) $q['tier'])['injured'] += (int) $q['qty'];
            }
            Db::exec("UPDATE queues SET state = 'cancelled' WHERE id = ?", [$qid]);
            Game::save($ctx);
            return ['refund' => array_map('intval', $refund)];
        });
    }

    /**
     * Tezlashtirish. free=true — tanishtiruv bepul tezlashtirishi (navbat darhol tugaydi).
     * Aks holda oy toshi, progressiv narx, kunlik 25% chegara (GDD bo'lim 17).
     */
    public static function speedup(int $pid, int $qid, int $seconds, bool $free, int $now): array
    {
        $res = Db::tx(function () use ($pid, $qid, $seconds, $free, $now) {
            $ctx = Game::lock($pid);
            $q = Db::one("SELECT * FROM queues WHERE id = ? AND player_id = ? AND state = 'running' FOR UPDATE", [$qid, $pid]);
            if (!$q) {
                throw new ApiError('NOT_FOUND', 'Navbat topilmadi');
            }
            $left = max(0, Db::ts($q['ends_at']) - $now);
            if ($free) {
                if ((int) $ctx['p']['free_speedups'] <= 0) {
                    throw new ApiError('NOT_ENOUGH_RESOURCES', 'Bepul tezlashtirish qolmagan');
                }
                $ctx['p']['free_speedups']--;
                Db::exec('UPDATE queues SET ends_at = ?, speeded_sec = speeded_sec + ? WHERE id = ?', [Db::dt($now), $left, $qid]);
                Game::save($ctx);
                return ['speeded' => $left, 'price' => 0];
            }
            $seconds = min($seconds, $left);
            if ($seconds <= 0) {
                throw new ApiError('BAD_REQUEST', 'Tezlashtirish soniyasi notoʻgʻri');
            }
            $day = gmdate('Y-m-d', $now);
            $cap = F::speedupDailyCap();
            $used = (int) (Db::val('SELECT used_seconds FROM speedup_usage WHERE player_id = ? AND usage_date = ? FOR UPDATE',
                [$pid, $day]) ?? 0);
            if ($used + $seconds > $cap) {
                throw new ApiError('SPEEDUP_CAP', 'Kunlik tezlashtirish chegarasi', ['left_seconds' => max(0, $cap - $used)]);
            }
            $price = F::speedupPrice($used, $seconds);
            if ($ctx['r']['moonstone'] < $price) {
                throw new ApiError('NOT_ENOUGH_RESOURCES', 'Oy toshi yetarli emas', ['missing' => ['moonstone' => $price - $ctx['r']['moonstone']]]);
            }
            $ctx['r']['moonstone'] -= $price;
            Db::exec('INSERT INTO speedup_usage (player_id, usage_date, used_seconds, cap_seconds) VALUES (?, ?, ?, ?)
                      ON DUPLICATE KEY UPDATE used_seconds = used_seconds + VALUES(used_seconds)', [$pid, $day, $seconds, $cap]);
            Db::exec('UPDATE queues SET ends_at = ?, speeded_sec = speeded_sec + ? WHERE id = ?',
                [Db::dt(Db::ts($q['ends_at']) - $seconds), $seconds, $qid]);
            Db::insert('transactions', ['player_id' => $pid, 'kind' => 'moonstone_spend', 'item_key' => 'speedup',
                'moonstone_delta' => -$price]);
            Game::save($ctx);
            return ['speeded' => $seconds, 'price' => $price];
        });
        Game::sync($pid, $now);
        return $res;
    }

    public static function speedupQuote(int $pid, int $seconds, int $now): array
    {
        $used = (int) (Db::val('SELECT used_seconds FROM speedup_usage WHERE player_id = ? AND usage_date = ?',
            [$pid, gmdate('Y-m-d', $now)]) ?? 0);
        $cap = F::speedupDailyCap();
        return ['price' => F::speedupPrice($used, $seconds), 'used_seconds' => $used, 'cap_seconds' => $cap];
    }
}
