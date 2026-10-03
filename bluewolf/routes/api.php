<?php

use App\Http\Controllers\Api\EconomyController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\StateController;
use App\Http\Middleware\TelegramAuth;
use Illuminate\Support\Facades\Route;

/*
| Blue Wolf API v1 — docs/blue_wolf/blue_wolf_api.md
| v0.0.2: holat, Ustaxona buferi va taqsimot. Qolganlari bosqichma-bosqich qoʻshiladi.
*/
Route::prefix('v1')->group(function () {
    Route::get('ping', [MetaController::class, 'ping']);
    Route::get('config', [MetaController::class, 'config']);

    Route::middleware(TelegramAuth::class)->group(function () {
        Route::get('state', [StateController::class, 'show']);
        Route::post('buildings/collect', [EconomyController::class, 'collect']);
        Route::post('profile/allocation', [EconomyController::class, 'allocation']);
    });
});
