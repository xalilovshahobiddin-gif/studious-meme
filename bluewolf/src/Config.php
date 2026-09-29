<?php
declare(strict_types=1);

namespace BlueWolf;

/**
 * game_config jadvali + data/ dagi jadval maʼlumotlari.
 * Kodda balans raqami yoʻq: mavjud boʻlmagan kalit — xato (jimgina default emas).
 */
final class Config
{
    private static ?array $values = null;
    private static array $data = [];

    /** Testlar uchun: bazasiz qiymatlar berish. */
    public static function set(array $values): void
    {
        self::$values = $values;
    }

    /** Keshni tozalash (masalan, cron uzoq ishlaganda yoki testda konfig oʻzgarganda). */
    public static function reset(): void
    {
        self::$values = null;
    }

    public static function all(): array
    {
        if (self::$values === null) {
            self::$values = [];
            foreach (Db::all('SELECT config_key, config_value FROM game_config') as $r) {
                self::$values[$r['config_key']] = (float) $r['config_value'];
            }
        }
        return self::$values;
    }

    public static function get(string $key): float
    {
        $all = self::all();
        if (!array_key_exists($key, $all)) {
            throw new \LogicException("game_config kaliti topilmadi: $key");
        }
        return $all[$key];
    }

    public static function int(string $key): int
    {
        return (int) round(self::get($key));
    }

    public static function data(string $name): array
    {
        if (!isset(self::$data[$name])) {
            self::$data[$name] = require dirname(__DIR__) . '/data/' . $name . '.php';
        }
        return self::$data[$name];
    }

    public static function level(int $level): array
    {
        $levels = self::data('levels');
        return $levels[max(1, min(count($levels), $level))];
    }
}
