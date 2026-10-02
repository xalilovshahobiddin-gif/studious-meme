<?php

use App\Support\Backup;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Cron sozlangan boʻlsa (php artisan schedule:run) — har kuni tunda zaxira
Schedule::command('zachkana:backup --auto')->dailyAt('03:10')->when(fn () => Backup::autoEnabled());
