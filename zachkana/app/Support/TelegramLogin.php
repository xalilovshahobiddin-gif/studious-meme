<?php

namespace App\Support;

/**
 * Telegram Login Widget maʼlumotlarini tekshirish:
 * https://core.telegram.org/widgets/login#checking-authorization
 */
class TelegramLogin
{
    /** Imzo necha soniyagacha amal qiladi */
    public const MAX_AGE = 86400;

    public const FIELDS = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date'];

    /**
     * @param  array<string, mixed>  $data  widget qaytargan maydonlar (hash bilan)
     * @return array<string, string>|null toʻgʻri boʻlsa — foydalanuvchi maʼlumotlari
     */
    public static function verify(array $data, string $botToken, ?int $now = null): ?array
    {
        $hash = $data['hash'] ?? null;
        $fields = array_filter(
            array_intersect_key($data, array_flip(self::FIELDS)),
            fn ($v) => is_scalar($v) && $v !== '',
        );
        if (! is_string($hash) || ! isset($fields['id'], $fields['auth_date'])) {
            return null;
        }

        ksort($fields);
        $check = implode("\n", array_map(fn ($k, $v) => "$k=$v", array_keys($fields), $fields));
        $expected = hash_hmac('sha256', $check, hash('sha256', $botToken, true));

        if (! hash_equals($expected, strtolower($hash))) {
            return null;
        }
        if (($now ?? time()) - (int) $fields['auth_date'] > self::MAX_AGE) {
            return null;
        }

        return array_map('strval', $fields);
    }
}
