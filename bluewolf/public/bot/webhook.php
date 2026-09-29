<?php
declare(strict_types=1);

// Telegram bot webhook. Oʻrnatish:
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://bluewolf.uz/bot/webhook.php&secret_token=<webhook_secret>

require_once dirname(__DIR__, 2) . '/src/bootstrap.php';

use BlueWolf\Notify;

$env = bw_env();
$secret = $env['webhook_secret'] ?? '';
if ($secret === '' || !hash_equals($secret, $_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '')) {
    http_response_code(403);
    exit;
}
$update = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];
$msg = $update['message'] ?? null;
if ($msg && isset($msg['chat']['id'])) {
    $text = trim((string) ($msg['text'] ?? ''));
    if (str_starts_with($text, '/start') || str_starts_with($text, '/play')) {
        Notify::telegram((int) $msg['chat']['id'],
            "🐺 Blue Wolf\n\nSen toʻdangni yoʻqotgan yolgʻiz boʻrisan. Ov qil, in qur, toʻda yigʻ va afsonaviy Koʻk Boʻriga aylan!",
            $env);
    }
}
echo 'ok';
