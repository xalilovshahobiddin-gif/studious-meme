<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BuildService;
use App\Services\PlayerService;
use App\Services\QuestService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Qurilish navbati: kuchaytirish, bekor qilish, bepul tezlashtirish (docs/blue_wolf/blue_wolf_api.md). */
class BuildController extends Controller
{
    public function __construct(
        private readonly PlayerService $players,
        private readonly BuildService $builds,
        private readonly QuestService $quests,
    ) {}

    /** POST /api/v1/buildings/upgrade — { type } */
    public function upgrade(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player, $sync] = $this->players->enter($request->attributes->get('tg_user'));
            $queue = $this->builds->upgrade($player, (string) $request->input('type'));
            $this->quests->track($player, 'build');

            return ApiResponse::ok(['queue' => $queue->toClient(), 'finished' => $sync['finished']], $this->players->snapshot($player));
        });
    }

    /** POST /api/v1/queue/cancel — { queue_id } → 80% qaytariladi */
    public function cancel(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player, $sync] = $this->players->enter($request->attributes->get('tg_user'));
            $refund = $this->builds->cancel($player, (int) $request->input('queue_id'));

            return ApiResponse::ok(['refund' => $refund, 'finished' => $sync['finished']], $this->players->snapshot($player));
        });
    }

    /** POST /api/v1/queue/speedup — { queue_id, use_free: true }. Oy toshi bilan tezlashtirish keyinroq. */
    public function speedup(Request $request): JsonResponse
    {
        if ($request->input('use_free') !== true) {
            return ApiResponse::error('NOT_AVAILABLE', 'Hozircha faqat bepul tezlashtirish mavjud', 400);
        }

        return DB::transaction(function () use ($request) {
            [$player] = $this->players->enter($request->attributes->get('tg_user'));
            $queue = $this->builds->speedupFree($player, (int) $request->input('queue_id'));
            // Tezlashtirish navbatni darhol tugatgan boʻlsa — shu soʻrovning oʻzida yopiladi
            [, $sync] = $this->players->enter($request->attributes->get('tg_user'));

            return ApiResponse::ok(['queue' => $queue->toClient(), 'finished' => $sync['finished']], $this->players->snapshot($player->refresh()));
        });
    }
}
