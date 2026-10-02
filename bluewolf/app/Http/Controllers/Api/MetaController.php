<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GameConfig;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class MetaController extends Controller
{
    /** GET /api/v1/ping — server tirikmi, versiya. Auth talab qilinmaydi. */
    public function ping(): JsonResponse
    {
        return ApiResponse::ok([
            'name' => 'Blue Wolf',
            'version' => config('bluewolf.version'),
            'server_time' => now()->toIso8601ZuluString(),
        ]);
    }

    /** GET /api/v1/config — klient uchun ochiq balans parametrlari (game_config). */
    public function config(): JsonResponse
    {
        return ApiResponse::ok([
            'version' => config('bluewolf.version'),
            'params' => (object) GameConfig::allValues(),
        ]);
    }
}
