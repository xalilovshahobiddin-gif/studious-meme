<?php
declare(strict_types=1);

// Cron (texnik spec 4.6). Har daqiqa ishga tushiring:
//   * * * * * php /path/to/bluewolf/cron/cron.php >> /path/to/logs/cron.log 2>&1
// Oʻyin mantiqi soʻrovda ham ishlaydi (lazy); cron — bildirishnomalar va
// oflayn oʻyinchilar uchun (hujum yetib kelishi, navbat tugashi).

require_once dirname(__DIR__) . '/src/bootstrap.php';

use BlueWolf\Bots;
use BlueWolf\Db;
use BlueWolf\Game;
use BlueWolf\Notify;
use BlueWolf\Pvp;

$lock = fopen(sys_get_temp_dir() . '/bluewolf-cron.lock', 'c');
if (!flock($lock, LOCK_EX | LOCK_NB)) {
    exit(0); // oldingi ishga tushirish hali tugamagan
}
$now = time();
$t0 = microtime(true);

// 1. Yetib kelgan yurishlar → jang / razvedka
$marches = 0;
foreach (Db::all("SELECT id FROM marches WHERE state = 'outbound' AND arrives_at <= ? ORDER BY arrives_at LIMIT 500",
    [Db::dt($now)]) as $m) {
    Pvp::resolveMarch((int) $m['id']);
    $marches++;
}

// 2. Tugagan navbat / ov / qaytishlari bor real oʻyinchilar
$pids = Db::all("SELECT DISTINCT player_id FROM queues WHERE state = 'running' AND ends_at <= ?
                 UNION SELECT DISTINCT player_id FROM hunts WHERE state = 'running' AND ends_at <= ?
                 UNION SELECT DISTINCT m.player_id FROM marches m JOIN players p ON p.id = m.player_id
                   WHERE p.is_bot = 0 AND m.state IN ('returning','recalled') AND m.returns_at <= ?
                 LIMIT 500", [Db::dt($now), Db::dt($now), Db::dt($now)]);
foreach ($pids as $row) {
    Game::sync((int) $row['player_id'], $now);
}

// 3. Bildirishnomalar
$sent = Notify::sendDue($now);

// 4. Kunda bir marta (00:00 UTC atrofida): NPC havzasi, eski yozuvlarni tozalash
if ((int) gmdate('i', $now) === 0 && (int) gmdate('G', $now) === 0) {
    Bots::ensurePool($now);
    Db::exec('DELETE FROM request_log WHERE created_at < ?', [Db::dt($now - 86400)]);
    Db::exec('DELETE FROM match_offers WHERE expires_at < ?', [Db::dt($now - 86400)]);
}

printf("[%s] marches=%d players=%d notif=%d %.2fs\n", gmdate('c', $now), $marches, count($pids), $sent, microtime(true) - $t0);
