<?php
declare(strict_types=1);

namespace BlueWolf;

/** Telegram WebApp initData tekshiruvi (API bo'lim 1). Sessiya yoʻq — har soʻrov mustaqil. */
final class Auth
{
    /** @return array Telegram user (id, first_name, username, language_code...) */
    public static function userFromHeaders(array $headers, int $now): array
    {
        $env = \bw_env();
        $init = $headers['x-init-data'] ?? '';
        if ($init === '' && $env['dev'] && isset($headers['x-dev-user'])) {
            // Faqat dev rejimi: brauzerda Telegramsiz sinash uchun
            $id = (int) $headers['x-dev-user'];
            if ($id <= 0) {
                throw new ApiError('UNAUTHORIZED', 'Dev foydalanuvchi notoʻgʻri');
            }
            return ['id' => $id, 'first_name' => 'Dev ' . $id, 'language_code' => 'uz'];
        }
        return self::verify($init, $env['bot_token'], $now);
    }

    public static function verify(string $initData, string $botToken, int $now): array
    {
        if ($initData === '' || $botToken === '') {
            throw new ApiError('UNAUTHORIZED', 'initData yoʻq');
        }
        parse_str($initData, $fields);
        $hash = $fields['hash'] ?? '';
        unset($fields['hash']);
        ksort($fields);
        $pairs = [];
        foreach ($fields as $k => $v) {
            $pairs[] = $k . '=' . $v;
        }
        $secret = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $check = hash_hmac('sha256', implode("\n", $pairs), $secret);
        if (!is_string($hash) || !hash_equals($check, $hash)) {
            throw new ApiError('UNAUTHORIZED', 'initData imzosi notoʻgʻri');
        }
        if ($now - (int) ($fields['auth_date'] ?? 0) > 86400) {
            throw new ApiError('UNAUTHORIZED', 'initData eskirgan');
        }
        $user = json_decode((string) ($fields['user'] ?? ''), true);
        if (!is_array($user) || !isset($user['id'])) {
            throw new ApiError('UNAUTHORIZED', 'Foydalanuvchi maʼlumoti yoʻq');
        }
        return $user;
    }

    /** Test/dev uchun: imzolangan initData yasash. */
    public static function sign(array $fields, string $botToken): string
    {
        ksort($fields);
        $pairs = [];
        foreach ($fields as $k => $v) {
            $pairs[] = $k . '=' . $v;
        }
        $secret = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $fields['hash'] = hash_hmac('sha256', implode("\n", $pairs), $secret);
        return http_build_query($fields, '', '&', PHP_QUERY_RFC3986);
    }
}
