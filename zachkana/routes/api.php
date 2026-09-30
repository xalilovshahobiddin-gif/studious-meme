<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BootstrapController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\ShajaraController;
use Illuminate\Support\Facades\Route;

/*
| Frontend bilan bir domenda ishlaydi, shuning uchun sessiya (cookie) va CSRF
| himoyasi bilan "web" middleware guruhi ishlatiladi. URL: /api/...
*/
Route::middleware('web')->group(function () {
    Route::get('bootstrap', BootstrapController::class);

    Route::get('clans/{clan:slug}/tree', [ShajaraController::class, 'tree']);
    Route::get('history', [ContentController::class, 'history']);
    Route::get('timeline', [ContentController::class, 'timeline']);
    Route::get('veterans', [ContentController::class, 'veterans']);
    Route::get('veterans/{veteran}', [ContentController::class, 'veteran']);

    Route::get('me', [AuthController::class, 'me']);
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
    });

    Route::middleware('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);

        Route::middleware('throttle:20,1')->group(function () {
            Route::post('people/suggestions', [ShajaraController::class, 'suggest']);
            Route::post('veterans/{veteran}/memories', [ContentController::class, 'storeMemory']);
            Route::post('submissions', [ContentController::class, 'storeSubmission']);
        });

        Route::get('channels/{channel:slug}/messages', [ChatController::class, 'messages']);
        Route::post('channels/{channel:slug}/messages', [ChatController::class, 'store'])->middleware('throttle:30,1');
    });
});
