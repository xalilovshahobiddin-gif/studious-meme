<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BootstrapController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\FamilyController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ShajaraController;
use App\Http\Controllers\SocialAuthController;
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
    Route::get('announcements', [NotificationController::class, 'announcements']);
    Route::get('announcements/{announcement}', [NotificationController::class, 'announcement']);
    Route::get('notifications', [NotificationController::class, 'index']);

    Route::get('me', [AuthController::class, 'me']);
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
        // Telefon orqali — vaqtincha oʻchirilgan (sozlamadan yoqiladi)
        Route::post('phone/register', [AuthController::class, 'phoneRegister']);
        Route::post('phone/login', [AuthController::class, 'phoneLogin']);
    });

    Route::middleware('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('link/telegram', [SocialAuthController::class, 'linkIntent']);
        Route::post('notifications/read', [NotificationController::class, 'read']);
        Route::get('notifications/unread', [NotificationController::class, 'unread']);

        // Oilaviy shajara (faqat egasiga koʻrinadi)
        Route::get('family', [FamilyController::class, 'index']);
        Route::middleware('throttle:60,1')->group(function () {
            Route::post('family', [FamilyController::class, 'store']);
            Route::patch('family/{member}', [FamilyController::class, 'update']);
            Route::delete('family/{member}', [FamilyController::class, 'destroy']);
            Route::post('family/{member}/photo', [FamilyController::class, 'photo']);
        });

        Route::middleware('throttle:20,1')->group(function () {
            Route::post('people/suggestions', [ShajaraController::class, 'suggest']);
            Route::post('veterans/{veteran}/memories', [ContentController::class, 'storeMemory']);
            Route::post('submissions', [ContentController::class, 'storeSubmission']);
        });

        Route::get('channels/{channel:slug}/messages', [ChatController::class, 'messages']);
        Route::post('channels/{channel:slug}/messages', [ChatController::class, 'store'])->middleware('throttle:30,1');
        Route::delete('channels/{channel:slug}/messages/{message}', [ChatController::class, 'destroy']);
        Route::post('channels/{channel:slug}/messages/{message}/react', [ChatController::class, 'react'])->middleware('throttle:60,1');
    });
});
