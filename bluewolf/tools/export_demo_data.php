<?php
declare(strict_types=1);

// Demo uchun maʼlumot eksporti: game_config (sql/*.sql INSERT lardan), daraja/oʻlja/tanishtiruv/
// vazifa jadvallari va uz lokalizatsiyasi → JS obyekti. Bazasiz ishlaydi.
// Ishlatish: php tools/export_demo_data.php > public/assets/demo-data.js

$root = dirname(__DIR__);
$config = [];
foreach (glob("$root/sql/*.sql") as $file) {
    // game_config qatorlari: ('kalit', qiymat, 'birlik', 'izoh') — boshqa jadvallarga INSERT yoʻq
    preg_match_all("/^\\s*\\(\\s*'([a-z0-9_]+)',\\s*(-?[0-9.]+)\\s*,/m", file_get_contents($file), $m, PREG_SET_ORDER);
    foreach ($m as $row) {
        $config[$row[1]] = (float) $row[2]; // keyingi migratsiya oldingisini ustidan yozadi
    }
}

$data = [
    'config' => $config,
    'levels' => require "$root/data/levels.php",
    'prey' => require "$root/data/prey.php",
    'tutorial' => require "$root/data/tutorial.php",
    'quests' => require "$root/data/quests.php",
    'locales' => require "$root/data/locales/uz.php",
];

echo "/* AVTOMATIK YARATILGAN: php tools/export_demo_data.php — qoʻlda tahrirlamang. */\n";
echo 'window.BW_DEMO_DATA = ' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION) . ";\n";
