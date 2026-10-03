<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ArmyService;
use App\Services\EconomyService;
use App\Services\HuntService;
use App\Services\PlayerService;
use App\Services\ProgressService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Askarlar mashqi va ov (docs/blue_wolf/blue_wolf_api.md, 5–6-boʻlimlar). */
class ArmyController extends Controller
{
    public function __construct(
        private readonly PlayerService $players,
        private readonly ArmyService $army,
        private readonly HuntService $hunts,
        private readonly EconomyService $economy,
        private readonly ProgressService $progress,
    ) {}

    /** POST /api/v1/army/train — { role, tier, qty } */
    public function train(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player, $sync] = $this->players->enter($request->attributes->get('tg_user'));
            $queue = $this->army->train($player, (string) $request->input('role'), (int) $request->input('tier', 1), (int) $request->input('qty'));

            return ApiResponse::ok(['queue' => $queue->toClient(), 'finished' => $sync['finished']], $this->players->snapshot($player));
        });
    }

    /** GET /api/v1/hunt/board — joriy 9 ta ov kartasi. */
    public function board(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player] = $this->players->enter($request->attributes->get('tg_user'));

            return ApiResponse::ok($this->hunts->board($player), $this->players->snapshot($player));
        });
    }

    /** POST /api/v1/hunt/solo — yolgʻiz ov (1–3 daraja). */
    public function solo(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player, $sync] = $this->players->enter($request->attributes->get('tg_user'));
            $loot = $this->hunts->solo($player);
            $lost = $this->economy->addFoodNow($player, 'meat', $loot['meat']);
            $this->economy->addFoodNow($player, 'herb', $loot['herb']);
            $finished = $sync['finished'];
            foreach ($this->progress->addXp($player, $loot['xp']) as $level) {
                $finished[] = ['kind' => 'level', 'level' => $level];
            }

            return ApiResponse::ok(['loot' => $loot + ['lost' => $lost], 'finished' => $finished], $this->players->snapshot($player->refresh()));
        });
    }

    /** POST /api/v1/hunt — { slot: 0..8, payload: { rol: { tier: soni } } } → ov xaritasidagi kartaga ov. */
    public function hunt(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player, $sync] = $this->players->enter($request->attributes->get('tg_user'));
            $march = $this->hunts->start($player, (int) $request->input('slot', -1), (array) $request->input('payload', []));

            return ApiResponse::ok(['march' => $march->toClient(), 'finished' => $sync['finished']], $this->players->snapshot($player));
        });
    }
}
