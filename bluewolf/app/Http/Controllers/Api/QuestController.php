<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlayerService;
use App\Services\QuestService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Vazifalar: kundalik / haftalik / oylik, sandiqlar, kirish sovgʻasi (GDD bo'lim 14). */
class QuestController extends Controller
{
    public function __construct(
        private readonly PlayerService $players,
        private readonly QuestService $quests,
    ) {}

    /** GET /api/v1/quests */
    public function index(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player] = $this->players->enter($request->attributes->get('tg_user'));

            return ApiResponse::ok($this->quests->state($player), $this->players->snapshot($player));
        });
    }

    /** POST /api/v1/quests/claim — { id } (vazifa yoki sandiq) */
    public function claim(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player] = $this->players->enter($request->attributes->get('tg_user'));
            $got = $this->quests->claim($player, (int) $request->input('id'));

            return ApiResponse::ok($got, $this->players->snapshot($player->refresh()));
        });
    }

    /** POST /api/v1/quests/login — 7 kunlik kirish sovgʻasi */
    public function login(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player] = $this->players->enter($request->attributes->get('tg_user'));
            $got = $this->quests->claimLogin($player);

            return ApiResponse::ok($got, $this->players->snapshot($player->refresh()));
        });
    }
}
