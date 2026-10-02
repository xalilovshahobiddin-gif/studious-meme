<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlayerService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StateController extends Controller
{
    public function __construct(private readonly PlayerService $players) {}

    /** GET /api/v1/state — toʻliq oʻyin holati (kirishda bir marta). */
    public function show(Request $request): JsonResponse
    {
        $player = $this->players->forTelegramUser($request->attributes->get('tg_user'));

        return ApiResponse::ok($this->players->fullState($player), $this->players->snapshot($player));
    }
}
