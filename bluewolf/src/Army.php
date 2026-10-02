<?php
declare(strict_types=1);

namespace BlueWolf;

/** Qoʻshin: mashq, tierga almashtirish, davolash (GDD bo'lim 6). */
final class Army
{
    public static function describe(array $ctx): array
    {
        $lvl = $ctx['p']['level'];
        $roles = [];
        foreach (F::ROLES as $role) {
            $bl = $ctx['b'][F::ROLE_BUILDING[$role]];
            $max = F::maxTier($role, $lvl, $bl);
            $tiers = [];
            for ($t = 1; $t <= F::TIERS; $t++) {
                $u = $ctx['army']["$role:$t"] ?? ['alive' => 0, 'on_march' => 0, 'injured' => 0];
                $tiers[] = [
                    'tier' => $t, 'alive' => $u['alive'], 'on_march' => $u['on_march'], 'injured' => $u['injured'],
                    'cp' => round(F::tierCp($role, $t, $lvl), 1), 'unlocked' => $t <= $max,
                    'cost' => F::trainCost($t),
                ];
            }
            $roles[] = [
                'role' => $role, 'unlock_level' => F::roleUnlock($role), 'unlocked' => $max > 0,
                'building' => F::ROLE_BUILDING[$role], 'building_level' => $bl, 'max_tier' => $max,
                'count' => Game::roleCount($ctx, $role), 'building_cap' => (int) floor(F::roleCap($bl)),
                'tiers' => $tiers,
            ];
        }
        $cap = F::armyCap($lvl);
        $occ = Game::soldiers($ctx, false) / max(1, $cap);
        return [
            'roles' => $roles, 'count' => Game::soldiers($ctx), 'cap' => $cap,
            'occupancy' => round($occ, 3), 'time_coef' => round(F::occupancyCoef($occ), 2),
            'hospital' => ['cap' => F::healCap($ctx['b']['hospital']), 'minutes' => round(F::healTime($ctx['b']['hospital']) / 60, 1)],
        ];
    }

    private static function checkRole(array $ctx, string $role, int $tier): void
    {
        if (!in_array($role, F::ROLES, true)) {
            throw new ApiError('BAD_REQUEST', 'Nomaʼlum rol');
        }
        if ($ctx['p']['level'] < F::roleUnlock($role)) {
            throw new ApiError('LEVEL_TOO_LOW', 'Rol hali ochilmagan', ['need_level' => F::roleUnlock($role)]);
        }
        $max = F::maxTier($role, $ctx['p']['level'], $ctx['b'][F::ROLE_BUILDING[$role]]);
        if ($tier < 1 || $tier > $max) {
            throw new ApiError('TIER_LOCKED', 'Tier hali ochilmagan', ['max_tier' => $max]);
        }
    }

    private static function roleQueueBusy(int $pid, string $role): void
    {
        $n = (int) Db::val("SELECT COUNT(*) FROM queues WHERE player_id = ? AND role = ? AND kind IN ('train','promote')
                             AND state = 'running'", [$pid, $role]);
        if ($n > 0) {
            throw new ApiError('QUEUE_BUSY', 'Bu rol binosida mashq davom etmoqda');
        }
    }

    /** Mashq vaqti = tier vaqti × bino jazosi × toʻlganlik ÷ (mashq tezligi × In bonusi) */
    public static function trainPlan(array $ctx, string $role, int $tier, int $qty): array
    {
        $lvl = $ctx['p']['level'];
        $bl = $ctx['b'][F::ROLE_BUILDING[$role]];
        $cap = F::armyCap($lvl);
        $occ = Game::soldiers($ctx, false) / max(1, $cap);
        $coef = min(Config::get('final_time_coef_max'),
            F::buildingPenalty(Game::roleCount($ctx, $role) + $qty, F::roleCap($bl)) * F::occupancyCoef($occ));
        $sec = (int) ceil(F::trainTime($tier) * $qty * $coef / (F::trainSpeed($bl) * F::denCoef($lvl)));
        $c = F::trainCost($tier);
        return ['cost' => ['meat' => $c['meat'] * $qty, 'bone' => $c['bone'] * $qty], 'seconds' => $sec,
            'time_coef' => round($coef, 3)];
    }

    public static function train(int $pid, string $role, int $tier, int $qty, int $now): array
    {
        if ($qty < 1) {
            throw new ApiError('BAD_REQUEST', 'Miqdor notoʻgʻri');
        }
        return Db::tx(function () use ($pid, $role, $tier, $qty, $now) {
            $ctx = Game::lock($pid);
            self::checkRole($ctx, $role, $tier);
            self::roleQueueBusy($pid, $role);
            $pending = (int) Db::val("SELECT COALESCE(SUM(qty),0) FROM queues WHERE player_id = ? AND kind = 'train' AND state = 'running'", [$pid]);
            $cap = F::armyCap($ctx['p']['level']);
            if (Game::soldiers($ctx) + $pending + $qty > $cap) {
                throw new ApiError('CAPACITY_FULL', 'Qoʻshin sigʻimi toʻlgan',
                    ['free' => max(0, $cap - Game::soldiers($ctx) - $pending)]);
            }
            $plan = self::trainPlan($ctx, $role, $tier, $qty);
            Game::spend($ctx, $plan['cost']);
            $id = Db::insert('queues', [
                'player_id' => $pid, 'kind' => 'train', 'role' => $role, 'tier' => $tier, 'qty' => $qty,
                'time_coef' => $plan['time_coef'], 'started_at' => Db::dt($now), 'ends_at' => Db::dt($now + $plan['seconds']),
            ]);
            Game::save($ctx);
            return ['queue_id' => $id, 'seconds' => $plan['seconds'], 'ends_at' => Game::iso(Db::dt($now + $plan['seconds']))];
        });
    }

    public static function promotePlan(array $ctx, string $role, int $from, int $to, int $qty): array
    {
        if ($from < 1 || $to <= $from) {
            throw new ApiError('BAD_REQUEST', 'Tierlar notoʻgʻri');
        }
        self::checkRole($ctx, $role, $to);
        $need = (int) ceil($qty * F::promoteNeed($from, $to));
        $c = F::trainCost($to);
        $share = Config::get('promote_cost_share');
        $bl = $ctx['b'][F::ROLE_BUILDING[$role]];
        $sec = (int) ceil(F::trainTime($to) * Config::get('promote_time_share') * $qty
            / (F::trainSpeed($bl) * F::denCoef($ctx['p']['level'])));
        $have = $ctx['army']["$role:$from"]['alive'] ?? 0;
        return [
            'consumes' => $need, 'produces' => $qty, 'available' => $have,
            'cost' => ['meat' => (int) ceil($c['meat'] * $share * $qty), 'bone' => (int) ceil($c['bone'] * $share * $qty)],
            'seconds' => $sec,
            'cp_before' => (int) round($need * F::tierCp($role, $from, $ctx['p']['level'])),
            'cp_after' => (int) round($qty * F::tierCp($role, $to, $ctx['p']['level'])),
        ];
    }

    public static function promotePreview(int $pid, string $role, int $from, int $to, int $qty): array
    {
        return self::promotePlan(Game::lockless($pid), $role, $from, $to, max(1, $qty));
    }

    public static function promote(int $pid, string $role, int $from, int $to, int $qty, int $now): array
    {
        if ($qty < 1) {
            throw new ApiError('BAD_REQUEST', 'Miqdor notoʻgʻri');
        }
        return Db::tx(function () use ($pid, $role, $from, $to, $qty, $now) {
            $ctx = Game::lock($pid);
            $plan = self::promotePlan($ctx, $role, $from, $to, $qty);
            self::roleQueueBusy($pid, $role);
            if ($plan['available'] < $plan['consumes']) {
                throw new ApiError('NOT_ENOUGH_ARMY', 'Past tier askar yetarli emas', ['need' => $plan['consumes']]);
            }
            Game::spend($ctx, $plan['cost']);
            Game::unit($ctx, $role, $from)['alive'] -= $plan['consumes'];
            $id = Db::insert('queues', [
                'player_id' => $pid, 'kind' => 'promote', 'role' => $role, 'tier' => $to, 'from_tier' => $from,
                'qty' => $qty, 'started_at' => Db::dt($now), 'ends_at' => Db::dt($now + $plan['seconds']),
            ]);
            Game::save($ctx);
            return ['queue_id' => $id] + $plan;
        });
    }

    public static function heal(int $pid, string $role, int $tier, int $qty, int $now): array
    {
        return Db::tx(function () use ($pid, $role, $tier, $qty, $now) {
            $ctx = Game::lock($pid);
            $u = &Game::unit($ctx, $role, $tier);
            $cap = F::healCap($ctx['b']['hospital']);
            if ($qty < 1 || $qty > $u['injured']) {
                throw new ApiError('NOT_ENOUGH_ARMY', 'Jarohatlangan boʻri yetarli emas');
            }
            if ($qty > $cap) {
                throw new ApiError('CAPACITY_FULL', 'Shifo gʻori sigʻimi', ['cap' => $cap]);
            }
            if ((int) Db::val("SELECT COUNT(*) FROM queues WHERE player_id = ? AND kind = 'heal' AND state = 'running'", [$pid]) > 0) {
                throw new ApiError('QUEUE_BUSY', 'Shifo gʻori band');
            }
            $cost = ['meat' => (int) ceil(F::trainCost($tier)['meat'] * Config::get('heal_meat_share') * $qty)];
            Game::spend($ctx, $cost);
            $u['injured'] -= $qty;
            unset($u);
            $sec = F::healTime($ctx['b']['hospital']);
            $id = Db::insert('queues', [
                'player_id' => $pid, 'kind' => 'heal', 'role' => $role, 'tier' => $tier, 'qty' => $qty,
                'started_at' => Db::dt($now), 'ends_at' => Db::dt($now + $sec),
            ]);
            Game::save($ctx);
            return ['queue_id' => $id, 'seconds' => $sec, 'cost' => $cost];
        });
    }

    /** Toʻlovni tekshirish: [{role,tier,qty}] — takror rol/tier birlashtiriladi, faqat inda turganlar. */
    public static function normalizePayload(array $ctx, mixed $payload, ?array $onlyRoles = null): array
    {
        if (!is_array($payload) || !$payload) {
            throw new ApiError('BAD_REQUEST', 'Qoʻshin tanlanmagan');
        }
        $sum = [];
        foreach ($payload as $g) {
            $role = $g['role'] ?? '';
            $tier = (int) ($g['tier'] ?? 0);
            $qty = (int) ($g['qty'] ?? 0);
            if (!in_array($role, F::ROLES, true) || $tier < 1 || $tier > F::TIERS || $qty < 0) {
                throw new ApiError('BAD_REQUEST', 'Qoʻshin tarkibi notoʻgʻri');
            }
            if ($onlyRoles !== null && !in_array($role, $onlyRoles, true)) {
                throw new ApiError('BAD_REQUEST', 'Bu vazifaga bu rol yuborilmaydi');
            }
            if ($qty > 0) {
                $sum["$role:$tier"] = ($sum["$role:$tier"] ?? 0) + $qty;
            }
        }
        $out = [];
        foreach ($sum as $k => $qty) {
            [$role, $tier] = explode(':', $k);
            if (($ctx['army'][$k]['alive'] ?? 0) < $qty) {
                throw new ApiError('NOT_ENOUGH_ARMY', 'Inda yetarli askar yoʻq', ['role' => $role, 'tier' => (int) $tier]);
            }
            $out[] = ['role' => $role, 'tier' => (int) $tier, 'qty' => $qty];
        }
        if (!$out) {
            throw new ApiError('BAD_REQUEST', 'Qoʻshin tanlanmagan');
        }
        return $out;
    }

    /** Guruhlarni yurishga chiqarish / qaytarish. */
    public static function move(array &$ctx, array $groups, string $from, string $to): void
    {
        foreach ($groups as $g) {
            $u = &Game::unit($ctx, $g['role'], (int) $g['tier']);
            $u[$from] -= $g['qty'];
            $u[$to] += $g['qty'];
            unset($u);
        }
    }
}
