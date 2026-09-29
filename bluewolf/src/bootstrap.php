<?php
declare(strict_types=1);

// Blue Wolf — umumiy ishga tushirish: autoload, sozlamalar, UTC.

date_default_timezone_set('UTC');

spl_autoload_register(function (string $class): void {
    $prefix = 'BlueWolf\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }
    $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

/**
 * Muhit sozlamalari: config/config.php (gitga kirmaydi) yoki muhit oʻzgaruvchilari.
 */
function bw_env(): array
{
    static $env = null;
    if ($env !== null) {
        return $env;
    }
    $env = [
        'db_dsn'      => getenv('BW_DB_DSN') ?: 'mysql:host=127.0.0.1;dbname=bluewolf;charset=utf8mb4',
        'db_user'     => getenv('BW_DB_USER') ?: 'root',
        'db_pass'     => getenv('BW_DB_PASS') ?: '',
        'bot_token'   => getenv('BW_BOT_TOKEN') ?: '',
        'webapp_url'  => getenv('BW_WEBAPP_URL') ?: 'https://bluewolf.uz/',
        'client_version_min' => getenv('BW_CLIENT_MIN') ?: '1.0.0',
        // dev: Telegram tashqarisida X-Dev-User sarlavhasi bilan kirishga ruxsat
        'dev'         => (getenv('BW_DEV') ?: '0') === '1',
        'cron_key'    => getenv('BW_CRON_KEY') ?: '',
    ];
    $file = dirname(__DIR__) . '/config/config.php';
    if (is_file($file)) {
        $env = array_merge($env, require $file);
    }
    return $env;
}
