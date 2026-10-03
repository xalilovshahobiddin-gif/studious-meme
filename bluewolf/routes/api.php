<?php

use App\Http\Controllers\Api\ArmyController;
use App\Http\Controllers\Api\BuildController;
use App\Http\Controllers\Api\EconomyController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\QuestController;
use App\Http\Controllers\Api\StateController;
use App\Http\Controllers\Api\TutorialController;
use App\Http\Middleware\TelegramAuth;
use Illuminate\Support\Facades\Route;

/*
| Blue Wolf API v1 — docs/blue_wolf/blue_wolf_api.md
| v0.0.9: holat, Ustaxona, qurilish, askarlar mashqi, ov xaritasi, vazifalar, tanishtiruv. Qolganlari bosqichma-bosqich qoʻshiladi.
*/
Route::prefix('v1')->group(function () {
    Route::get('ping', [MetaController::class, 'ping']);
    Route::get('config', [MetaController::class, 'config']);

    Route::middleware(TelegramAuth::class)->group(function () {
        Route::get('state', [StateController::class, 'show']);
        Route::post('buildings/collect', [EconomyController::class, 'collect']);
        Route::post('buildings/upgrade', [BuildController::class, 'upgrade']);
        Route::post('queue/cancel', [BuildController::class, 'cancel']);
        Route::post('queue/speedup', [BuildController::class, 'speedup']);
        Route::post('army/train', [ArmyController::class, 'train']);
        Route::get('hunt/board', [ArmyController::class, 'board']);
        Route::post('hunt/solo', [ArmyController::class, 'solo']);
        Route::post('hunt', [ArmyController::class, 'hunt']);
        Route::get('quests', [QuestController::class, 'index']);
        Route::post('quests/claim', [QuestController::class, 'claim']);
        Route::post('quests/login', [QuestController::class, 'login']);
        Route::post('tutorial/step', [TutorialController::class, 'step']);
        Route::post('tutorial/skip', [TutorialController::class, 'skip']);
        Route::post('profile/allocation', [EconomyController::class, 'allocation']);
    });
});
