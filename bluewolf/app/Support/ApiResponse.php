<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * API javob konverti (docs/blue_wolf/blue_wolf_api.md, 2-boʻlim):
 *   muvaffaqiyat: { ok: true, data: {...}, state: {...} }
 *   xato:         { ok: false, error: { code, message, details } }
 */
class ApiResponse
{
    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>|null  $state
     */
    public static function ok(array $data = [], ?array $state = null): JsonResponse
    {
        $body = ['ok' => true, 'data' => (object) $data];
        if ($state !== null) {
            $body['state'] = $state;
        }

        return response()->json($body);
    }

    /**
     * @param  array<string, mixed>  $details
     */
    public static function error(string $code, string $message, int $status, array $details = []): JsonResponse
    {
        return response()->json([
            'ok' => false,
            'error' => ['code' => $code, 'message' => $message, 'details' => (object) $details],
        ], $status);
    }
}
