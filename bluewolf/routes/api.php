<?php

use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\StateController;
use App\Http\Middleware\TelegramAuth;
use Illuminate\Support\Facades\Route;

/*
| Blue Wolf API v1 — docs/blue_wolf/blue_wolf_api.md
| v0.0.0: faqat skelet endpointlari. Qolganlari bosqichma-bosqich qoʻshiladi.
*/
Route::prefix('v1')->group(function () {
    Route::get('ping', [MetaController::class, 'ping']);
    Route::get('config', [MetaController::class, 'config']);

    Route::middleware(TelegramAuth::class)->group(function () {
        Route::get('state', [StateController::class, 'show']);
    });
});
