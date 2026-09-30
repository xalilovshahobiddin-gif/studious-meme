<?php

namespace App\Support;

use App\Models\Setting;

/**
 * Qaysi kirish usullari yoqilgan. Qiymatlar admin paneldagi "Kirish sozlamalari"
 * sahifasidan (settings jadvali), boʻlmasa .env dan olinadi.
 */
class AuthSettings
{
    public const KEYS = [
        'auth_password' => 'Login va parol',
        'auth_phone' => 'Telefon raqam (SMS)',
        'auth_google' => 'Google',
        'google_client_id' => 'Google Client ID',
        'google_client_secret' => 'Google Client Secret',
        'auth_telegram' => 'Telegram',
        'telegram_bot_username' => 'Telegram bot nomi',
        'telegram_bot_token' => 'Telegram bot tokeni',
    ];

    public static function passwordEnabled(): bool
    {
        return Setting::get('auth_password', '1') === '1';
    }

    /** Telefon orqali kirish vaqtincha oʻchirilgan — kod saqlangan, sozlamadan yoqiladi. */
    public static function phoneEnabled(): bool
    {
        return Setting::get('auth_phone', '0') === '1';
    }

    /** @return array{client_id: string, client_secret: string, redirect: string}|null */
    public static function google(): ?array
    {
        $id = Setting::get('google_client_id') ?: config('services.google.client_id');
        $secret = Setting::get('google_client_secret') ?: config('services.google.client_secret');
        if (Setting::get('auth_google', '1') !== '1' || ! $id || ! $secret) {
            return null;
        }

        return ['client_id' => $id, 'client_secret' => $secret, 'redirect' => url('/auth/google/callback')];
    }

    /** @return array{bot_username: string, bot_token: string}|null */
    public static function telegram(): ?array
    {
        $bot = ltrim((string) (Setting::get('telegram_bot_username') ?: config('services.telegram.bot_username')), '@');
        $token = Setting::get('telegram_bot_token') ?: config('services.telegram.bot_token');
        if (Setting::get('auth_telegram', '1') !== '1' || ! $bot || ! $token) {
            return null;
        }

        return ['bot_username' => $bot, 'bot_token' => $token];
    }

    /** Frontend uchun (maxfiy kalitlarsiz). */
    public static function forFrontend(): array
    {
        return [
            'password' => self::passwordEnabled(),
            'phone' => self::phoneEnabled(),
            'google' => self::google() !== null,
            'telegram' => self::telegram()['bot_username'] ?? null,
        ];
    }
}
