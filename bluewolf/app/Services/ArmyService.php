<?php

namespace App\Services;

use App\Models\Army;
use App\Models\GameConfig;
use App\Models\Player;
use App\Models\Queue;
use App\Support\Formula;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/** Askarlar va mashq (GDD bo'lim 6, API 5-boʻlim). */
class ArmyService
{
    /**
     * Rol → tier boʻyicha sanoq: alive (inda), away (yurishda), injured.
     *
     * @return array{alive: array<string, list<int>>, away: array<string, list<int>>, injured: array<string, list<int>>, total: int}
     */
    public function summary(Player $player): array
    {
        $empty = array_fill_keys(Army::ROLES, array_fill(0, 6, 0));
        $out = ['alive' => $empty, 'away' => $empty, 'injured' => $empty, 'total' => 0];
        foreach ($player->army()->get() as $row) {
            $out['alive'][$row->role][$row->tier - 1] = $row->alive;
            $out['away'][$row->role][$row->tier - 1] = $row->on_march;
            $out['injured'][$row->role][$row->tier - 1] = $row->injured;
            $out['total'] += $row->alive + $row->on_march + $row->injured;
        }

        return $out;
    }

    /** Qoʻshin hajmi (oziqlanish va toʻlganlik uchun): inda + yurishda + jarohatlangan. */
    public function total(Player $player): int
    {
        return (int) $player->army()->selectRaw('COALESCE(SUM(alive + on_march + injured), 0) AS n')->value('n');
    }

    /** Yaradorlar tuzaldi: injured → alive. */
    public function heal(Player $player, string $role, int $tier, int $qty): void
    {
        Army::query()->where(['player_id' => $player->id, 'role' => $role, 'tier' => $tier])
            ->update(['injured' => DB::raw('injured - '.$qty), 'alive' => DB::raw('alive + '.$qty)]);
    }

    /**
     * Shifo gʻorida davolash (GDD bo'lim 5): yaradorlar tabiiy tuzalish navbatidan olinadi,
     * oʻt yechiladi, bitta umumiy muolaja (rol × tier boʻyicha qatorlar, bir xil tugash vaqti) boshlanadi.
     * Chaqiruvchi: tranzaksiya ichida, sync() qilingan.
     *
     * @param  array<string, array<int|string, int>>  $troops  rol → [tier => soni]
     * @return array{queues: list<Queue>, plan: array<string, mixed>}
     *
     * @throws GameException
     */
    public function hospitalHeal(Player $player, array $troops, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();
        $hospital = (int) ($player->buildings()->where('type', 'hospital')->value('level') ?? 0);
        if ($hospital < 1) {
            throw new GameException('LEVEL_TOO_LOW', 'Shifo gʻori hali qurilmagan', 400);
        }
        if ($player->queues()->where('kind', 'heal')->where('state', 'running')->where('building_type', 'hospital')->exists()) {
            throw new GameException('QUEUE_BUSY', 'Shifo gʻori band — joriy muolaja tugashini kuting', 409);
        }

        // Tozalash va tekshirish: faqat tabiiy tuzalayotgan yaradorlar yuboriladi
        $clean = [];
        foreach ($troops as $role => $tiers) {
            if (! in_array($role, Army::ROLES, true) || ! is_array($tiers)) {
                throw new GameException('VALIDATION', 'Rol notoʻgʻri', 422);
            }
            foreach ($tiers as $tier => $qty) {
                $tier = (int) $tier;
                $qty = (int) $qty;
                if ($qty === 0) {
                    continue;
                }
                if ($tier < 1 || $tier > 6 || $qty < 0) {
                    throw new GameException('VALIDATION', 'Tier yoki son notoʻgʻri', 422);
                }
                $waiting = (int) $player->queues()->where(['kind' => 'heal', 'state' => 'running', 'role' => $role, 'tier' => $tier])
                    ->whereNull('building_type')->sum('qty');
                if ($qty > $waiting) {
                    throw new GameException('NOT_ENOUGH_TROOPS', 'Buncha yarador yoʻq', 400, ['role' => $role, 'tier' => $tier, 'available' => $waiting]);
                }
                $clean[$role][$tier] = $qty;
            }
        }
        if ($clean === []) {
            throw new GameException('VALIDATION', 'Davolash uchun boʻri tanlanmagan', 422);
        }

        $plan = Formula::healPlan($cfg, $hospital, $player->level, $clean);
        $res = $player->resources;
        if ((float) $res->herb + 1e-9 < $plan['herb']) {
            throw new GameException('NOT_ENOUGH_RESOURCES', 'Shifobaxsh oʻt yetmaydi', 400, ['missing' => ['herb' => round($plan['herb'] - (float) $res->herb, 2)]]);
        }
        $res->herb = (float) $res->herb - $plan['herb'];
        $res->save();

        $endsAt = $now->addMilliseconds((int) round($plan['minutes'] * 60000));
        $queues = [];
        foreach ($clean as $role => $tiers) {
            foreach ($tiers as $tier => $qty) {
                // Tabiiy navbatdan eng kech tugaydiganlaridan boshlab olinadi
                $left = $qty;
                $rows = $player->queues()->where(['kind' => 'heal', 'state' => 'running', 'role' => $role, 'tier' => $tier])
                    ->whereNull('building_type')->orderByDesc('ends_at')->lockForUpdate()->get();
                foreach ($rows as $row) {
                    if ($left <= 0) {
                        break;
                    }
                    $take = min($left, $row->qty);
                    $left -= $take;
                    if ($take === $row->qty) {
                        $row->state = 'cancelled';
                    } else {
                        $row->qty -= $take;
                    }
                    $row->save();
                }
                $queues[] = $player->queues()->create([
                    'kind' => 'heal', 'building_type' => 'hospital', 'role' => $role, 'tier' => $tier, 'qty' => $qty,
                    'cost' => ['herb' => self::round2($qty * Formula::healHerb($cfg, $tier, $player->level))],
                    'started_at' => $now, 'ends_at' => $endsAt,
                ]);
            }
        }

        return ['queues' => $queues, 'plan' => $plan];
    }

    private static function round2(float $x): float
    {
        return floor($x * 100 + 0.5) / 100;
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

        $unit = Formula::trainCost($cfg, $tier, $player->level);
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
            // Tanishtiruvda mashq darhol tugaydi (GDD bo'lim 15)
            'ends_at' => TutorialService::active($player) ? $now : $now->addMilliseconds((int) round($seconds * 1000)),
        ]);
    }
}
