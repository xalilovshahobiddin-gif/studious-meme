<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlayerService;
use App\Services\TutorialService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Tanishtiruv (GDD bo'lim 15, API `/tutorial/*`). */
class TutorialController extends Controller
{
    public function __construct(
        private readonly PlayerService $players,
        private readonly TutorialService $tutorial,
    ) {}

    /** POST /api/v1/tutorial/step — { step } navbatdagi qadam */
    public function step(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player] = $this->players->enter($request->attributes->get('tg_user'));
            $done = $this->tutorial->complete($player, (int) $request->input('step'));

            return ApiResponse::ok($done, $this->players->snapshot($player->refresh()));
        });
    }

    /** POST /api/v1/tutorial/skip — qolganining XP si bilan yakunlash */
    public function skip(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player] = $this->players->enter($request->attributes->get('tg_user'));
            $done = $this->tutorial->skip($player);

            return ApiResponse::ok($done, $this->players->snapshot($player->refresh()));
        });
    }
}
