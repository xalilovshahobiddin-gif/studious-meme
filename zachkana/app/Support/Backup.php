<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;
use ZipArchive;

/**
 * Zaxira nusxa: baza (har bir jadval JSON Lines koʻrinishida + phpMyAdmin uchun database.sql)
 * va yuklangan fayllar (storage/app/public) bitta zip faylga yoziladi.
 * mysqldump yoki exec() shart emas — oddiy (shared) hostingda ham ishlaydi.
 */
class Backup
{
    /** Zaxiraga kirmaydigan (vaqtinchalik) jadvallar */
    public const SKIP_TABLES = ['migrations', 'sessions', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs', 'password_reset_tokens'];

    /** Avtomatik zaxiralardan nechtasi saqlanadi */
    public const KEEP_AUTO = 7;

    public static function dir(): string
    {
        return storage_path('app/backups');
    }

    public static function available(): bool
    {
        return class_exists(ZipArchive::class);
    }

    /** @return list<string> */
    public static function tables(): array
    {
        return collect(Schema::getTableListing(schemaQualified: false))
            ->reject(fn ($t) => in_array($t, self::SKIP_TABLES, true) || str_starts_with($t, 'sqlite_'))
            ->sort()->values()->all();
    }

    /** Yangi zaxira yaratadi va fayl nomini qaytaradi. $kind: manual | auto | restore */
    public static function create(string $kind = 'manual'): string
    {
        if (! self::available()) {
            throw new RuntimeException('Serverda PHP zip kengaytmasi yoʻq. Hosting panelida uni yoqing.');
        }
        File::ensureDirectoryExists(self::dir());
        self::protectDir();
        @set_time_limit(300);

        $name = 'zachkana-'.now()->format('Y-m-d-His').'-'.$kind.'.zip';
        $path = self::dir().'/'.$name;
        $tmp = self::dir().'/.tmp-'.Str::random(8);
        File::ensureDirectoryExists($tmp);

        try {
            $zip = new ZipArchive;
            if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new RuntimeException('Zaxira faylini yaratib boʻlmadi.');
            }

            $pdo = DB::connection()->getPdo();
            $sql = fopen("$tmp/database.sql", 'w');
            fwrite($sql, '-- Zachkana zaxira nusxasi, '.now()->toDateTimeString()."\n-- Faqat maʼlumotlar. Jadvallar saytni oʻrnatganda yaratiladi.\nSET FOREIGN_KEY_CHECKS=0;\nSET NAMES utf8mb4;\n\n");
            $counts = [];
            foreach (self::tables() as $table) {
                $jsonl = fopen("$tmp/$table.jsonl", 'w');
                $n = 0;
                fwrite($sql, "DELETE FROM `$table`;\n");
                $query = DB::table($table);
                $key = Schema::hasColumn($table, 'id') ? 'id' : null;
                $rows = $key ? $query->lazyById(500, $key) : $query->cursor();
                foreach ($rows as $row) {
                    $row = (array) $row;
                    fwrite($jsonl, json_encode($row, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)."\n");
                    $values = array_map(fn ($v) => match (true) {
                        $v === null => 'NULL',
                        is_bool($v) => $v ? '1' : '0',
                        is_int($v), is_float($v) => (string) $v,
                        default => $pdo->quote((string) $v),
                    }, $row);
                    fwrite($sql, "INSERT INTO `$table` (`".implode('`, `', array_keys($row)).'`) VALUES ('.implode(', ', $values).");\n");
                    $n++;
                }
                fclose($jsonl);
                fwrite($sql, "\n");
                $zip->addFile("$tmp/$table.jsonl", "db/$table.jsonl");
                $counts[$table] = $n;
            }
            fwrite($sql, "SET FOREIGN_KEY_CHECKS=1;\n");
            fclose($sql);
            $zip->addFile("$tmp/database.sql", 'database.sql');

            $files = 0;
            $public = storage_path('app/public');
            if (is_dir($public)) {
                foreach (File::allFiles($public) as $file) {
                    if ($file->getFilename() === '.gitignore') {
                        continue;
                    }
                    $zip->addFile($file->getPathname(), 'files/'.str_replace('\\', '/', $file->getRelativePathname()));
                    $files++;
                }
            }

            $zip->addFromString('manifest.json', json_encode([
                'app' => 'zachkana',
                'format' => 1,
                'kind' => $kind,
                'created_at' => now()->toIso8601String(),
                'site' => url('/'),
                'tables' => $counts,
                'files' => $files,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            $zip->addFromString('OQING.txt', self::readme());

            if (! $zip->close()) {
                throw new RuntimeException('Zaxira faylini yozib boʻlmadi (diskda joy yetarlimi?).');
            }
        } catch (Throwable $e) {
            @unlink($path);
            throw $e;
        } finally {
            File::deleteDirectory($tmp);
        }

        if ($kind === 'auto') {
            self::prune();
        }

        return $name;
    }

    /**
     * Zaxiralar roʻyxati (eng yangisi birinchi).
     *
     * @return list<array{name: string, size: int, date: int, kind: string}>
     */
    public static function all(): array
    {
        return collect(File::glob(self::dir().'/*.zip'))
            ->map(fn ($p) => [
                'name' => basename($p),
                'size' => filesize($p),
                'date' => filemtime($p),
                'kind' => preg_match('/-(manual|auto|restore|upload)\.zip$/', $p, $m) ? $m[1] : 'upload',
            ])
            ->sortByDesc('date')->values()->all();
    }

    /** Foydalanuvchi bergan nomdan xavfsiz yoʻl (katalogdan chiqib ketmaslik uchun) */
    public static function path(string $name): string
    {
        $name = basename($name);
        $path = self::dir().'/'.$name;
        if (! str_ends_with($name, '.zip') || ! is_file($path)) {
            throw new RuntimeException('Zaxira fayli topilmadi.');
        }

        return $path;
    }

    public static function delete(string $name): void
    {
        @unlink(self::path($name));
    }

    /** Eski avtomatik zaxiralarni oʻchirish */
    public static function prune(): void
    {
        collect(self::all())->where('kind', 'auto')->slice(self::KEEP_AUTO)->each(fn ($b) => @unlink(self::dir().'/'.$b['name']));
    }

    /** Zaxira faylini tekshirish; manifestni qaytaradi */
    public static function inspect(string $path): array
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            throw new RuntimeException('Bu zip fayl emas yoki shikastlangan.');
        }
        $manifest = json_decode((string) $zip->getFromName('manifest.json'), true);
        $zip->close();
        if (($manifest['app'] ?? null) !== 'zachkana' || ! is_array($manifest['tables'] ?? null)) {
            throw new RuntimeException('Bu Zachkana zaxira fayli emas.');
        }

        return $manifest;
    }

    /**
     * Zaxiradan tiklash: bazadagi maʼlumotlar zaxiradagisi bilan almashtiriladi,
     * fayllar qayta yoziladi. Oldin hozirgi holat "restore" zaxirasi sifatida saqlanadi.
     *
     * @return array{tables: int, rows: int, files: int, safety: string}
     */
    public static function restore(string $name): array
    {
        $path = self::path($name);
        $manifest = self::inspect($path);
        @set_time_limit(600);
        $safety = self::create('restore');

        $zip = new ZipArchive;
        $zip->open($path);
        $current = self::tables();
        $rows = 0;
        $tables = 0;

        Schema::disableForeignKeyConstraints();
        try {
            foreach (array_keys($manifest['tables']) as $table) {
                if (! in_array($table, $current, true)) {
                    continue; // yangi versiyada bunday jadval yoʻq
                }
                $stream = $zip->getStream("db/$table.jsonl");
                if (! $stream) {
                    continue;
                }
                $columns = array_flip(Schema::getColumnListing($table));
                DB::table($table)->delete();
                $batch = [];
                while (($line = fgets($stream)) !== false) {
                    if (trim($line) === '') {
                        continue;
                    }
                    // Eski zaxirada boʻlib, hozir yoʻq ustunlar tashlab yuboriladi
                    $batch[] = array_intersect_key(json_decode($line, true), $columns);
                    if (count($batch) === 200) {
                        DB::table($table)->insert($batch);
                        $rows += 200;
                        $batch = [];
                    }
                }
                fclose($stream);
                if ($batch) {
                    DB::table($table)->insert($batch);
                    $rows += count($batch);
                }
                $tables++;
            }
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        // Fayllar (suratlar)
        $files = 0;
        $public = storage_path('app/public');
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entry = $zip->getNameIndex($i);
            if (! str_starts_with($entry, 'files/') || str_ends_with($entry, '/') || str_contains($entry, '..')) {
                continue;
            }
            $target = $public.'/'.substr($entry, 6);
            File::ensureDirectoryExists(dirname($target));
            file_put_contents($target, $zip->getFromIndex($i));
            $files++;
        }
        $zip->close();
        Cache::flush();

        return ['tables' => $tables, 'rows' => $rows, 'files' => $files, 'safety' => $safety];
    }

    /** Yuklangan zaxira faylini roʻyxatga qoʻshish (boshqa hostingdan koʻchirish uchun) */
    public static function import(string $uploadedPath): string
    {
        self::inspect($uploadedPath);
        File::ensureDirectoryExists(self::dir());
        $name = 'zachkana-'.now()->format('Y-m-d-His').'-upload.zip';
        File::move($uploadedPath, self::dir().'/'.$name);

        return $name;
    }

    /* ---------- Avtomatik kunlik zaxira ---------- */

    public static function autoEnabled(): bool
    {
        return Setting::get('backup_auto', '1') === '1';
    }

    private static function marker(): string
    {
        return self::dir().'/.last-auto';
    }

    public static function lastAuto(): ?int
    {
        return is_file(self::marker()) ? filemtime(self::marker()) : null;
    }

    /** Har bir soʻrovda chaqiriladi — faqat fayl vaqtini tekshiradi (tez) */
    public static function autoDue(): bool
    {
        $last = self::lastAuto();

        // Sayt oʻrnatilmagan boʻlsa (install.php) bazaga murojaat qilinmaydi
        return (! $last || time() - $last >= 86400) && self::available()
            && is_file(storage_path('installed')) && self::autoEnabled();
    }

    public static function createAuto(): string
    {
        File::ensureDirectoryExists(self::dir());
        touch(self::marker());

        return self::create('auto');
    }

    /** Sahifa foydalanuvchiga yuborilgandan keyin ishlaydi — saytni sekinlashtirmaydi */
    public static function runAuto(): void
    {
        File::ensureDirectoryExists(self::dir());
        // Bir vaqtda ikki soʻrov ikki marta zaxira qilmasligi uchun avval belgi qoʻyiladi
        $lock = fopen(self::dir().'/.lock', 'c');
        if (! $lock || ! flock($lock, LOCK_EX | LOCK_NB)) {
            return;
        }
        try {
            if (! self::autoDue()) {
                return;
            }
            self::createAuto();
        } catch (Throwable $e) {
            Log::warning('Avtomatik zaxira bajarilmadi: '.$e->getMessage());
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /** Apache: zaxiralar katalogiga brauzer orqali kirishni taqiqlash (qoʻshimcha himoya) */
    private static function protectDir(): void
    {
        $ht = self::dir().'/.htaccess';
        if (! is_file($ht)) {
            @file_put_contents($ht, "Require all denied\nDeny from all\n");
        }
    }

    private static function readme(): string
    {
        return <<<'TXT'
        Zachkana — zaxira nusxa

        Tiklashning oson yoʻli: admin panel → Tizim → Zaxira nusxalar → "Zaxira faylini yuklash",
        keyin roʻyxatdagi fayl yonidagi "Tiklash" tugmasi.

        Ichida:
          manifest.json   — qachon va nimalar saqlangani
          db/*.jsonl      — bazadagi har bir jadval (sayt shu fayllardan tiklaydi)
          database.sql    — xuddi shu maʼlumotlar SQL koʻrinishida (phpMyAdmin → Import)
          files/          — yuklangan suratlar (storage/app/public ichiga qoʻyiladi)
        TXT;
    }
}
