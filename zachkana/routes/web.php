<?php

use App\Http\Controllers\SocialAuthController;
use Illuminate\Support\Facades\Route;

// Sayt — public/index.html dagi SPA. Veb-server (Apache/Nginx) uni toʻgʻridan-toʻgʻri beradi;
// bu marshrut "php artisan serve" va boshqa holatlar uchun.
Route::get('/', fn () => response()->file(public_path('index.html'), ['Cache-Control' => 'no-cache']));

// Google va Telegram orqali kirish
Route::middleware('throttle:20,1')->prefix('auth')->group(function () {
    Route::get('google/redirect', [SocialAuthController::class, 'googleRedirect']);
    Route::get('google/callback', [SocialAuthController::class, 'googleCallback']);
    Route::get('telegram/callback', [SocialAuthController::class, 'telegramCallback']);
});
