<?php

use Illuminate\Support\Facades\Route;

// Mini App qobigʻi — public/index.html (build talab qilmaydigan PWA).
Route::get('/', fn () => response()->file(public_path('index.html'), [
    'Cache-Control' => 'no-cache',
]));
