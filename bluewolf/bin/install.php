<?php
declare(strict_types=1);

// Bazani oʻrnatish: sql/*.sql migratsiyalari + lokalizatsiya + NPC toʻdalar.
// Ishlatish: php bin/install.php [--fresh]
//   --fresh  — barcha jadvallarni oʻchirib qaytadan yaratadi (faqat dev!)

require_once dirname(__DIR__) . '/src/bootstrap.php';

use BlueWolf\Db;
use BlueWolf\Bots;
use BlueWolf\Config;

$pdo = Db::pdo();
$fresh = in_array('--fresh', $argv, true);

if ($fresh) {
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t) {
        $pdo->exec("DROP TABLE `$t`");
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    echo "Jadvallar oʻchirildi\n";
}

$pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (
  name VARCHAR(64) NOT NULL PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
$done = $pdo->query('SELECT name FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN);

foreach (glob(dirname(__DIR__) . '/sql/*.sql') as $file) {
    $name = basename($file);
    if (in_array($name, $done, true)) {
        continue;
    }
    $sql = file_get_contents($file);
    // Baza nomi sozlamadan olinadi — faylga yozilgan CREATE DATABASE / USE olib tashlanadi
    $sql = preg_replace('/CREATE DATABASE[^;]*;|USE\s+\w+\s*;/i', '', $sql);
    foreach (split_sql($sql) as $stmt) {
        $pdo->exec($stmt);
    }
    Db::insert('schema_migrations', ['name' => $name]);
    echo "Migratsiya: $name\n";
}

// Lokalizatsiya: data/locales/*.php → locales jadvali
$loc = [];
foreach (glob(dirname(__DIR__) . '/data/locales/*.php') as $f) {
    $lang = basename($f, '.php');
    foreach (require $f as $k => $v) {
        $loc[$k][$lang] = $v;
    }
}
foreach ($loc as $key => $t) {
    Db::exec('INSERT INTO locales (locale_key, uz, ru, en) VALUES (?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE uz = VALUES(uz), ru = VALUES(ru), en = VALUES(en)',
        [$key, $t['uz'] ?? $key, $t['ru'] ?? null, $t['en'] ?? null]);
}
echo 'Lokalizatsiya: ' . count($loc) . " kalit\n";

$n = Bots::ensurePool(time());
echo "NPC toʻdalar: +$n\n";
echo "Tayyor. game_config: " . count(Config::all()) . " kalit\n";

/** SQL faylni alohida buyruqlarga boʻlish (qator izohlari va qatorlar ichidagi ; hisobga olinadi). */
function split_sql(string $sql): array
{
    $out = [];
    $buf = '';
    $inStr = false;
    $len = strlen($sql);
    for ($i = 0; $i < $len; $i++) {
        $ch = $sql[$i];
        if (!$inStr && $ch === '-' && ($sql[$i + 1] ?? '') === '-') {
            $nl = strpos($sql, "\n", $i);
            $i = $nl === false ? $len : $nl;
            $buf .= "\n";
            continue;
        }
        if ($ch === "'" && ($i === 0 || $sql[$i - 1] !== '\\')) {
            $inStr = !$inStr;
        }
        if ($ch === ';' && !$inStr) {
            if (trim($buf) !== '') {
                $out[] = trim($buf);
            }
            $buf = '';
            continue;
        }
        $buf .= $ch;
    }
    if (trim($buf) !== '') {
        $out[] = trim($buf);
    }
    return $out;
}
