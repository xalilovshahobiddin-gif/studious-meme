<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlayerService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StateController extends Controller
{
    public function __construct(private readonly PlayerService $players) {}

    /** GET /api/v1/state — toʻliq oʻyin holati (kirishda va klient qayta sinxronlashda). */
    public function show(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player, $sync] = $this->players->enter($request->attributes->get('tg_user'));

            return ApiResponse::ok(
                $this->players->fullState($player) + $sync,
                $this->players->snapshot($player),
            );
        });
    }
}
