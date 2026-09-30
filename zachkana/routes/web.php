<?php

use Illuminate\Support\Facades\Route;

// Sayt — public/index.html dagi SPA. Veb-server (Apache/Nginx) uni toʻgʻridan-toʻgʻri beradi;
// bu marshrut "php artisan serve" va boshqa holatlar uchun.
Route::get('/', fn () => response()->file(public_path('index.html'), ['Cache-Control' => 'no-cache']));
