<?php
declare(strict_types=1);

// Testlar: php tests/run.php
// Formulalar Excel (blue_wolf_darajalar.xlsx) qiymatlariga solishtiriladi, keyin
// alohida test bazasida (BW_TEST_DB, default bluewolf_test) toʻliq oʻyin oqimi sinaladi.

$testDb = getenv('BW_TEST_DB') ?: 'bluewolf_test';
putenv('BW_DB_DSN=mysql:host=127.0.0.1;dbname=' . $testDb . ';charset=utf8mb4');
putenv('BW_DEV=1');
putenv('BW_BOT_TOKEN=123456:TEST');

require_once dirname(__DIR__) . '/src/bootstrap.php';

$GLOBALS['fails'] = 0;
$GLOBALS['count'] = 0;

function ok(bool $cond, string $name, mixed $got = null): void
{
    $GLOBALS['count']++;
    if (!$cond) {
        $GLOBALS['fails']++;
        echo "  ✗ $name" . ($got !== null ? ' — got: ' . json_encode($got, JSON_UNESCAPED_UNICODE) : '') . "\n";
    }
}

function near(float $a, float $b, float $eps, string $name): void
{
    ok(abs($a - $b) <= $eps, "$name (kutilgan $b)", $a);
}

// Test bazasini noldan tayyorlash
$root = new PDO('mysql:host=127.0.0.1;charset=utf8mb4', bw_env()['db_user'], bw_env()['db_pass']);
$root->exec("DROP DATABASE IF EXISTS `$testDb`");
$root->exec("CREATE DATABASE `$testDb` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
ob_start();
$argv = ['install.php'];
require dirname(__DIR__) . '/bin/install.php';
ob_end_clean();
// Oqim testlari bir "daqiqa" ichida koʻp soʻrov yuboradi — chastota chegarasi alohida tekshiriladi
BlueWolf\Db::exec("UPDATE game_config SET config_value = 100000 WHERE config_key LIKE 'rl\\_%'");
BlueWolf\Config::reset();

foreach (glob(__DIR__ . '/*Test.php') as $file) {
    echo basename($file) . "\n";
    require $file;
}

echo "\n{$GLOBALS['count']} tekshiruv, {$GLOBALS['fails']} xato\n";
exit($GLOBALS['fails'] > 0 ? 1 : 0);
