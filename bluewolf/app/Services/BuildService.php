<?php

namespace App\Services;

use App\Models\Building;
use App\Models\GameConfig;
use App\Models\Player;
use App\Models\Queue;
use App\Support\Formula;
use Carbon\CarbonImmutable;

/**
 * Qurilish navbati (GDD bo'lim 5, API 4-boʻlim, texnik spec 4.2).
 * Formulalar public/js/game.js → buildingCost / buildingTime bilan bir xil.
 */
class BuildService
{
    /**
     * Binoning $level darajasi narxi. 1-daraja bepul.
     *
     * @return array<string, int>
     */
    public static function cost(array $cfg, string $type, int $level): array
    {
        $meta = Building::META[$type] ?? null;
        if ($meta === null || $level <= 1) {
            return [];
        }
        $mult = $cfg['cost_growth'] ** ($level - 2) * Formula::stage($cfg, $level);
        if (isset($meta['role'])) {
            $coef = $cfg['cost_coef_'.$meta['role']];
            $base = ['stone' => $cfg['cost_role_stone'] * $coef, 'bone' => $cfg['cost_role_bone'] * $coef, 'hide' => $cfg['cost_role_hide'] * $coef];
        } else {
            $base = array_map(fn ($key) => $cfg[$key], $meta['cost']);
        }

        return array_map(fn ($v) => (int) round($v * $mult), $base);
    }

    /** Qurilish vaqti, soniya. */
    public static function seconds(array $cfg, string $type, int $level): int
    {
        $meta = Building::META[$type] ?? null;
        if ($meta === null || $level <= 1) {
            return 0;
        }
        $minutes = $cfg['build_time_base_min'] * $cfg[$meta['time']] * $cfg['time_growth'] ** ($level - 2) * Formula::stage($cfg, $level);

        return (int) round($minutes * 60);
    }

    /**
     * Binoni kuchaytirishni navbatga qoʻyadi. Chaqiruvchi: tranzaksiya ichida, resurslar sync() qilingan.
     *
     * @throws GameException
     */
    public function upgrade(Player $player, string $type, ?CarbonImmutable $now = null): Queue
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();

        if ($type === 'den') {
            throw new GameException('DEN_AUTO_LEVEL', 'In darajasi oʻyinchi darajasi bilan oʻzi oshadi');
        }
        if (! isset(Building::META[$type])) {
            throw new GameException('VALIDATION', 'Bunday bino yoʻq', 422);
        }
        $building = $player->buildings()->where('type', $type)->first();
        if ($building === null) {
            throw new GameException('LEVEL_TOO_LOW', 'Bino hali ochilmagan', 400, ['unlock_level' => Building::TYPES[$type]]);
        }

        $running = $player->queues()->where('kind', 'build')->where('state', 'running')->get();
        if ($running->contains('building_type', $type)) {
            throw new GameException('QUEUE_BUSY', 'Bu bino allaqachon qurilmoqda', 409);
        }
        $target = $building->level + 1;
        if ($target > $player->level) {
            throw new GameException('LEVEL_TOO_LOW', 'Bino oʻyinchi darajasidan oshmaydi', 400, ['need_level' => $target]);
        }
        $slots = $player->buildSlots();
        if ($running->count() >= $slots) {
            throw new GameException('QUEUE_BUSY', 'Qurilish navbati band', 409, ['slots' => $slots]);
        }

        $cost = self::cost($cfg, $type, $target);
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

        $usedSlots = $running->pluck('slot')->all();

        return $player->queues()->create([
            'kind' => 'build',
            'slot' => in_array(1, $usedSlots, true) ? 2 : 1,
            'building_type' => $type,
            'target_level' => $target,
            'cost' => $cost,
            'started_at' => $now,
            // Tanishtiruvda navbat darhol tugaydi (GDD bo'lim 15)
            'ends_at' => TutorialService::active($player) ? $now : $now->addSeconds(self::seconds($cfg, $type, $target)),
        ]);
    }

    /**
     * Navbatni bekor qilish: yechilgan resursning queue_cancel_refund (80%) qismi qaytadi.
     *
     * @return array<string, int>
     */
    public function cancel(Player $player, int $queueId): array
    {
        $queue = $this->running($player, $queueId);
        if ($queue->kind === 'heal') {
            throw new GameException('VALIDATION', 'Tuzalishni bekor qilib boʻlmaydi', 422);
        }
        $rate = GameConfig::value('queue_cancel_refund', 0.8);
        $refund = array_map(fn ($v) => (int) floor($v * $rate), $queue->cost);

        if (Queue::query()->whereKey($queue->id)->where('state', 'running')->update(['state' => 'cancelled']) !== 1) {
            throw new GameException('NOT_FOUND', 'Navbat topilmadi', 404);
        }
        $res = $player->resources;
        $cave = (int) ($player->buildings()->where('type', 'food_cave')->value('level') ?? 0);
        $cap = EconomyService::caveCap(GameConfig::allValues(), $cave);
        foreach ($refund as $k => $v) {
            // Oziq (mashq goʻshti) Oziq gʻori sigʻimidan oshmaydi
            $res->{$k} = in_array($k, ['meat', 'herb'], true) ? max((float) $res->{$k}, min($cap, (float) $res->{$k} + $v)) : (float) $res->{$k} + $v;
        }
        $res->save();

        return $refund;
    }

    /** Bepul tezlashtirish: qolgan vaqtdan koʻpi bilan tutorial_speedup_min daqiqa olib tashlanadi. */
    public function speedupFree(Player $player, int $queueId, ?CarbonImmutable $now = null): Queue
    {
        $now ??= CarbonImmutable::now();
        $queue = $this->running($player, $queueId);
        if ($player->free_speedups < 1) {
            throw new GameException('NOT_ENOUGH_RESOURCES', 'Bepul tezlashtirish qolmadi', 400);
        }
        $left = max(0, $queue->ends_at->getTimestampMs() - $now->getTimestampMs()) / 1000;
        $cut = (int) ceil(min($left, GameConfig::value('tutorial_speedup_min', 60) * 60));

        // Shifo gʻoridagi muolaja — bitta umumiy taymer: hamma qatorlari birga tezlashadi
        $group = $queue->kind === 'heal' && $queue->building_type === 'hospital'
            ? $player->queues()->where(['kind' => 'heal', 'state' => 'running', 'building_type' => 'hospital'])->get()
            : collect([$queue]);
        foreach ($group as $item) {
            $item->ends_at = $item->ends_at->subSeconds($cut);
            $item->speeded_sec += $cut;
            $item->save();
        }
        $queue->refresh();
        $player->decrement('free_speedups');

        return $queue;
    }

    private function running(Player $player, int $queueId): Queue
    {
        $queue = $player->queues()->whereKey($queueId)->where('state', 'running')->first();
        if ($queue === null) {
            throw new GameException('NOT_FOUND', 'Navbat topilmadi yoki tugagan', 404);
        }

        return $queue;
    }
}
