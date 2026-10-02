<?php

namespace App\Console\Commands;

use App\Support\Backup;
use Illuminate\Console\Command;

/** Cron orqali zaxira: php artisan zachkana:backup (hosting panelida kuniga bir marta) */
class BackupCommand extends Command
{
    protected $signature = 'zachkana:backup {--auto : Avtomatik zaxira sifatida (eskilari tozalanadi)}';

    protected $description = 'Baza va yuklangan fayllarning zaxira nusxasini yaratadi';

    public function handle(): int
    {
        $name = $this->option('auto') ? Backup::createAuto() : Backup::create('manual');
        $this->info("Zaxira yaratildi: storage/app/backups/$name");

        return self::SUCCESS;
    }
}
