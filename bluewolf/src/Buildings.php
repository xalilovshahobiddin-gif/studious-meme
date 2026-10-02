<?php
declare(strict_types=1);

namespace BlueWolf;

/** Binolar (GDD bo'lim 5, API bo'lim 4). */
final class Buildings
{
    /** MVP da qurilmaydigan binolar (v2): Bozor. */
    public const V2 = ['market'];

    public static function describe(array $ctx): array
    {
        $lvl = $ctx['p']['level'];
        $busy = [];
        foreach (Db::all("SELECT id, building_type, ends_at FROM queues WHERE player_id = ? AND kind = 'build' AND state = 'running'",
            [$ctx['p']['id']]) as $q) {
            $busy[$q['building_type']] = ['queue_id' => (int) $q['id'], 'ends_at' => Game::iso($q['ends_at'])];
        }
        $out = [];
        foreach (F::BUILDINGS as $type) {
            $l = $ctx['b'][$type];
            $row = [
                'type' => $type, 'level' => $l, 'max_level' => $lvl, 'auto' => $type === 'den',
                'mvp' => !in_array($type, self::V2, true),
                'effect' => self::effect($type, $l, $lvl), 'busy' => $busy[$type] ?? null,
                'next' => null,
            ];
            if ($type !== 'den' && $l < $lvl && $l < Config::int('max_level')) {
                $row['next'] = [
                    'level' => $l + 1, 'cost' => F::buildingCost($type, $l + 1),
                    'seconds' => F::buildingTime($type, $l + 1), 'effect' => self::effect($type, $l + 1, $lvl),
                ];
            }
            $out[] = $row;
        }
        return $out;
    }

    public static function effect(string $type, int $l, int $playerLevel): array
    {
        $role = array_search($type, F::ROLE_BUILDING, true);
        if ($role !== false) {
            return ['max_tier' => F::maxTier($role, $playerLevel, $l), 'soldier_cap' => (int) floor(F::roleCap($l)),
                'train_speed' => round(F::trainSpeed($l), 2), 'role' => $role];
        }
        return match ($type) {
            'den' => ['train_speed' => round(F::denCoef($l), 2)],
            'food_cave' => ['capacity' => (int) floor(F::foodCap($l)), 'protection' => round(F::protection($l), 2)],
            'workshop' => ['per_hour' => round(F::workshopRate($l), 1), 'capacity' => (int) floor(F::workshopCap($l)),
                'slots' => F::workshopSlots($l)],
            'hospital' => ['heal_cap' => F::healCap($l), 'heal_minutes' => round(F::healTime($l) / 60, 1)],
            default => [],
        };
    }

    public static function upgrade(int $pid, string $type, int $now): array
    {
        if ($type === 'den') {
            throw new ApiError('DEN_AUTO_LEVEL', 'In darajasi oʻyinchi darajasi bilan avtomatik oʻsadi');
        }
        if (!in_array($type, F::BUILDINGS, true)) {
            throw new ApiError('BAD_REQUEST', 'Nomaʼlum bino');
        }
        if (in_array($type, self::V2, true)) {
            throw new ApiError('NOT_IN_MVP', 'Bu bino keyingi versiyada ochiladi');
        }
        return Db::tx(function () use ($pid, $type, $now) {
            $ctx = Game::lock($pid);
            $to = $ctx['b'][$type] + 1;
            if ($to > $ctx['p']['level'] || $to > Config::int('max_level')) {
                throw new ApiError('LEVEL_TOO_LOW', 'Bino oʻyinchi darajasidan oshmaydi', ['need_level' => $to]);
            }
            $running = Db::all("SELECT building_type FROM queues WHERE player_id = ? AND kind = 'build' AND state = 'running'", [$pid]);
            foreach ($running as $q) {
                if ($q['building_type'] === $type) {
                    throw new ApiError('QUEUE_BUSY', 'Bu bino allaqachon qurilmoqda');
                }
            }
            $slots = 1 + (int) $ctx['p']['second_queue'];
            if (count($running) >= $slots) {
                throw new ApiError('QUEUE_BUSY', 'Qurilish navbati band', ['slots' => $slots]);
            }
            Game::spend($ctx, F::buildingCost($type, $to));
            $sec = F::buildingTime($type, $to);
            $id = Db::insert('queues', [
                'player_id' => $pid, 'kind' => 'build', 'slot' => count($running) + 1,
                'building_type' => $type, 'target_level' => $to,
                'started_at' => Db::dt($now), 'ends_at' => Db::dt($now + $sec),
            ]);
            Game::save($ctx);
            return ['queue_id' => $id, 'ends_at' => Game::iso(Db::dt($now + $sec)), 'seconds' => $sec];
        });
    }

    /** Ustaxona yigʻimini omborga oʻtkazish. */
    public static function collect(int $pid): array
    {
        return Db::tx(function () use ($pid) {
            $ctx = Game::lock($pid);
            $got = [];
            foreach (F::WORKSHOP_RES as $k) {
                $n = floor($ctx['r']["ws_$k"]);
                $got[$k] = (int) $n;
                $ctx['r'][$k] += $n;
                $ctx['r']["ws_$k"] -= $n;
            }
            Game::save($ctx);
            return ['collected' => $got];
        });
    }

    public static function setAllocation(int $pid, array $a): array
    {
        $sum = 0;
        $set = [];
        foreach (F::WORKSHOP_RES as $k) {
            $v = $a[$k] ?? null;
            if (!is_int($v) || $v < 0 || $v > 100) {
                throw new ApiError('BAD_REQUEST', 'Taqsimot 0..100 butun son boʻlishi kerak');
            }
            $sum += $v;
            $set["alloc_$k"] = $v;
        }
        if ($sum !== 100) {
            throw new ApiError('BAD_REQUEST', 'Taqsimot yigʻindisi 100 boʻlishi kerak');
        }
        Db::update('player_resources', $set, 'player_id = ?', [$pid]);
        return ['allocation' => $a];
    }
}
