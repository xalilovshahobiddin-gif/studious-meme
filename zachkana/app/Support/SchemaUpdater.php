<?php

namespace App\Support;

use Illuminate\Support\Facades\Artisan;
use Throwable;

/**
 * Oddiy hostingda SSH boʻlmagani uchun: yangi versiya fayllari yuklangach, birinchi
 * soʻrovda bazadagi oʻzgarishlar (migratsiyalar) avtomatik bajariladi.
 * Oxirgi bajarilgan migratsiya nomi storage/framework/schema-version da saqlanadi.
 */
class SchemaUpdater
{
    public static function latestMigration(): string
    {
        $files = glob(database_path('migrations/*.php')) ?: [];

        return $files ? basename(max($files), '.php') : '';
    }

    public static function markerPath(): string
    {
        return storage_path('framework/schema-version');
    }

    /** Sayt oʻrnatilgan va baza eskirgan boʻlsa — migratsiyalarni bajaradi. */
    public static function ensure(): void
    {
        $latest = self::latestMigration();
        if (! is_file(storage_path('installed')) || @file_get_contents(self::markerPath()) === $latest) {
            return;
        }

        $lock = @fopen(storage_path('framework/schema.lock'), 'c');
        if (! $lock || ! flock($lock, LOCK_EX | LOCK_NB)) {
            return; // boshqa soʻrov allaqachon yangilayapti
        }
        try {
            if (Artisan::call('migrate', ['--force' => true]) === 0) {
                self::markDone();
            }
        } catch (Throwable $e) {
            report($e);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    public static function markDone(): void
    {
        @file_put_contents(self::markerPath(), self::latestMigration());
    }
}
