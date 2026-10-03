<?php

namespace App\Services;

use App\Models\Army;
use App\Models\GameConfig;
use App\Models\Player;
use App\Models\Queue;
use App\Support\Formula;
use Carbon\CarbonImmutable;

/** Askarlar va mashq (GDD bo'lim 6, API 5-boʻlim). */
class ArmyService
{
    /**
     * Rol → tier boʻyicha sanoq: alive (inda), away (yurishda), injured.
     *
     * @return array{alive: array<string, list<int>>, away: array<string, list<int>>, total: int}
     */
    public function summary(Player $player): array
    {
        $empty = array_fill_keys(Army::ROLES, array_fill(0, 6, 0));
        $out = ['alive' => $empty, 'away' => $empty, 'total' => 0];
        foreach ($player->army()->get() as $row) {
            $out['alive'][$row->role][$row->tier - 1] = $row->alive;
            $out['away'][$row->role][$row->tier - 1] = $row->on_march;
            $out['total'] += $row->alive + $row->on_march + $row->injured;
        }

        return $out;
    }

    /** Qoʻshin hajmi (oziqlanish va toʻlganlik uchun): inda + yurishda + jarohatlangan. */
    public function total(Player $player): int
    {
        return (int) $player->army()->selectRaw('COALESCE(SUM(alive + on_march + injured), 0) AS n')->value('n');
    }

    public function add(Player $player, string $role, int $tier, int $qty, string $column = 'alive'): void
    {
        Army::query()->firstOrCreate(['player_id' => $player->id, 'role' => $role, 'tier' => $tier]);
        Army::query()->where(['player_id' => $player->id, 'role' => $role, 'tier' => $tier])->increment($column, $qty);
    }

    /**
     * Mashqni navbatga qoʻyish. Chaqiruvchi: tranzaksiya ichida, sync() qilingan.
     *
     * @throws GameException
     */
    public function train(Player $player, string $role, int $tier, int $qty, ?CarbonImmutable $now = null): Queue
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();

        if (! in_array($role, Army::ROLES, true) || $qty < 1 || $qty > 10000) {
            throw new GameException('VALIDATION', 'Rol yoki son notoʻgʻri', 422);
        }
        $building = $player->buildings()->where('type', Formula::ROLE_BUILDING[$role])->first();
        if ($building === null) {
            throw new GameException('LEVEL_TOO_LOW', 'Mashq binosi hali ochilmagan', 400);
        }
        $maxTier = Formula::maxTier($cfg, $player->level, $building->level);
        if ($tier < 1 || $tier > $maxTier) {
            throw new GameException('TIER_LOCKED', 'Bu tier hali ochilmagan', 400, ['max_tier' => $maxTier]);
        }
        if ($player->queues()->where('kind', 'train')->where('state', 'running')->where('role', $role)->exists()) {
            throw new GameException('QUEUE_BUSY', 'Bu rol uchun mashq davom etmoqda', 409);
        }
        $total = $this->total($player);
        $queued = (int) $player->queues()->where('kind', 'train')->where('state', 'running')->sum('qty');
        $cap = Formula::armyCap($cfg, $player->level);
        if ($total + $queued + $qty > $cap) {
            throw new GameException('CAPACITY_FULL', 'Qoʻshin sigʻimi toʻlgan', 400, ['free' => max(0, $cap - $total - $queued)]);
        }

        $unit = Formula::trainCost($cfg, $tier);
        $cost = ['meat' => $unit['meat'] * $qty, 'bone' => $unit['bone'] * $qty];
        $res = $player->resources;
        $missing = [];
        foreach ($cost as $k => $v) {
            if ((float) $res->{$k} < $v) {
                $missing[$k] = $v - (int) floor((float) $res->{$k});
            }
        }
        if ($missing) {
            throw new GameException('NOT_ENOUGH_RESOURCES', 'Resurs yetarli emas', 400, ['missing' => $missing]);
        }
        foreach ($cost as $k => $v) {
            $res->{$k} = (float) $res->{$k} - $v;
        }
        $res->save();

        $roleTotal = (int) $player->army()->where('role', $role)->selectRaw('COALESCE(SUM(alive + on_march + injured), 0) AS n')->value('n');
        $seconds = Formula::trainSeconds($cfg, $tier, $player->level, $building->level, $total, $roleTotal) * $qty;

        return $player->queues()->create([
            'kind' => 'train',
            'role' => $role,
            'tier' => $tier,
            'qty' => $qty,
            'cost' => $cost,
            'started_at' => $now,
            'ends_at' => $now->addMilliseconds((int) round($seconds * 1000)),
        ]);
    }
}
