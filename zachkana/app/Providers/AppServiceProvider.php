<?php

namespace App\Providers;

use App\Support\SchemaUpdater;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Yangi versiya yuklangach bazani avtomatik yangilash (SSH boʻlmagan hosting uchun)
        if (! $this->app->runningInConsole()) {
            SchemaUpdater::ensure();
        }
    }
}
