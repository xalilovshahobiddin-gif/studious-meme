<?php

namespace App\Support;

/**
 * Telegram Mini App initData imzosini tekshirish.
 *
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *   secret_key = HMAC_SHA256(bot_token, "WebAppData")
 *   hash       = hex(HMAC_SHA256(data_check_string, secret_key))
 * data_check_string — "hash" dan boshqa barcha maydonlar, kalit boʻyicha
 * alfavit tartibida, "kalit=qiymat" koʻrinishida "\n" bilan birlashtirilgan.
 */
class TelegramInitData
{
    /**
     * Imzo toʻgʻri va muddati oʻtmagan boʻlsa — maydonlar (user JSON dekodlangan), aks holda null.
     *
     * @return array<string, mixed>|null
     */
    public static function validate(string $initData, string $botToken, int $maxAge, ?int $now = null): ?array
    {
        if ($initData === '' || $botToken === '') {
            return null;
        }

        parse_str($initData, $fields);
        $hash = $fields['hash'] ?? null;
        if (! is_string($hash) || $hash === '') {
            return null;
        }
        unset($fields['hash']);

        ksort($fields);
        $dataCheckString = collect($fields)
            ->map(fn ($value, $key) => $key.'='.$value)
            ->implode("\n");

        $secret = hash_hmac('sha256', $botToken, 'WebAppData', true);
        if (! hash_equals(hash_hmac('sha256', $dataCheckString, $secret), $hash)) {
            return null;
        }

        $authDate = (int) ($fields['auth_date'] ?? 0);
        if ($authDate <= 0 || ($now ?? time()) - $authDate > $maxAge) {
            return null;
        }

        $user = json_decode((string) ($fields['user'] ?? ''), true);
        if (! is_array($user) || ! isset($user['id'])) {
            return null;
        }
        $fields['user'] = $user;

        return $fields;
    }

    /**
     * Testlar va lokal sinov uchun imzolangan initData yasash.
     *
     * @param  array<string, scalar>  $fields
     */
    public static function sign(array $fields, string $botToken): string
    {
        ksort($fields);
        $dataCheckString = collect($fields)
            ->map(fn ($value, $key) => $key.'='.$value)
            ->implode("\n");
        $secret = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $fields['hash'] = hash_hmac('sha256', $dataCheckString, $secret);

        return http_build_query($fields, '', '&', PHP_QUERY_RFC3986);
    }
}
