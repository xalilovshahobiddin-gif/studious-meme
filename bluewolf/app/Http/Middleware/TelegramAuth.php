<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\TelegramInitData;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Har soʻrovda Telegram initData ni tekshiradi (sessiya saqlanmaydi).
 * Muvaffaqiyatli boʻlsa Telegram foydalanuvchisi $request->attributes->get('tg_user') da.
 */
class TelegramAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = null;

        $initData = (string) $request->header('X-Init-Data', '');
        if ($initData !== '') {
            $fields = TelegramInitData::validate(
                $initData,
                (string) config('bluewolf.bot_token'),
                (int) config('bluewolf.init_data_max_age'),
            );
            $user = $fields['user'] ?? null;
        } elseif (config('bluewolf.dev_auth') && $request->hasHeader('X-Dev-User')) {
            $id = (int) $request->header('X-Dev-User');
            $user = $id > 0 ? ['id' => $id, 'first_name' => 'Dev', 'username' => 'dev'.$id, 'language_code' => 'uz'] : null;
        }

        if ($user === null) {
            return ApiResponse::error('UNAUTHORIZED', 'initData notoʻgʻri yoki eski', 401);
        }

        $request->attributes->set('tg_user', $user);

        return $next($request);
    }
}
