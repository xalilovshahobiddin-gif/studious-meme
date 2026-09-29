<?php
declare(strict_types=1);

use BlueWolf\Db;
use BlueWolf\Game;

// Ikki real oʻyinchi orasida jang: hujum oflayn himoyachiga cron orqali yetib keladi.

$UID = 880001;
must(api('GET', '/state', [], null, 880001), 'A oʻyinchi');
must(api('GET', '/state', [], null, 880002), 'B oʻyinchi');
$a = (int) Db::val('SELECT id FROM players WHERE tg_id = 880001');
$b = (int) Db::val('SELECT id FROM players WHERE tg_id = 880002');
foreach ([$a, $b] as $id) {
    Db::exec('UPDATE players SET level = 7, xp = 760, tutorial_step = 20 WHERE id = ?', [$id]);
    Db::exec("UPDATE buildings SET level = 7 WHERE player_id = ? AND type IN ('den','food_cave')", [$id]);
}
Db::exec("INSERT INTO army (player_id, role, tier, alive) VALUES (?, 'attacker', 1, 17)", [$a]);
Db::exec("INSERT INTO army (player_id, role, tier, alive) VALUES (?, 'hunter', 1, 5)", [$b]);
Db::exec('UPDATE player_resources SET meat = 120, stone = 1000, wood = 1000, hide = 500, bone = 500 WHERE player_id = ?', [$b]);
$pB = Db::one('SELECT * FROM players WHERE id = ?', [$b]);
ok(!Game::isShielded($pB, $T), '7-daraja qalqonsiz');

$t = must(api('GET', '/pvp/targets'), 'targets (A)');
$ids = array_column($t['targets'], 'id');
ok(in_array($b, $ids, true), 'Real raqib roʻyxatda (botlardan oldin)', $ids);
$r = api('POST', '/pvp/attack', ['target_id' => $b, 'payload' => [['role' => 'attacker', 'tier' => 1, 'qty' => 17]]]);
$m = must($r, 'A → B hujum');
ok((int) Db::val("SELECT COUNT(*) FROM notifications WHERE player_id = ? AND type = 'attack_incoming'", [$b]) === 1,
    'B ga hujum haqida xabar');
$arr = (int) strtotime(str_replace(['T', 'Z'], [' ', ''], $m['arrives_at']) . ' UTC');

// Hech kim kirmaydi — cron hal qiladi
\BlueWolf\Pvp::resolveMarch((int) $m['march_id']);
$bat = Db::one('SELECT * FROM battles WHERE attacker_id = ? AND defender_id = ?', [$a, $b]);
ok($bat !== null, 'Jang yozildi');
if ($bat) {
    ok($bat['kind'] === 'pvp' && $bat['result'] === 'attacker_win', 'Kuchli hujumchi yutdi', [$bat['ratio'], $bat['result']]);
    $loot = json_decode($bat['loot'], true);
    ok(($loot['stone'] ?? 0) > 0, 'Oʻlja olindi', $loot);
    $unprot = 1000 * (1 - 0.42) * 0.22 * 1.0; // Oziq gʻori L7 himoya 42%, teng daraja
    ok(($loot['stone'] ?? 0) <= (int) ceil($unprot), 'Oʻlja himoyalanmagan ulushdan oshmaydi', $loot['stone'] ?? null);
    $inj = (int) Db::val("SELECT injured FROM army WHERE player_id = ? AND role = 'hunter'", [$b]);
    ok($inj > 0, 'Himoyachi boʻrilari jarohatlandi (oʻlmaydi)', $inj);
    $pB = Db::one('SELECT * FROM players WHERE id = ?', [$b]);
    ok($pB['shield_until'] !== null, '30%+ yoʻqotgan himoyachiga qalqon');
    $stone = (float) Db::val('SELECT stone FROM player_resources WHERE player_id = ?', [$b]);
    near($stone, 1000 - ($loot['stone'] ?? 0), 1, 'Oʻlja himoyachidan ayirildi');
}
// A qaytgach oʻlja keladi
$T = $arr + ($arr - $T) + 5;
$before = must(api('GET', '/state'), 'A state (qaytdi)');
ok(count($before['marches']) === 0, 'A qoʻshini qaytdi');
