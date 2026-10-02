<?php
declare(strict_types=1);

use BlueWolf\Api;
use BlueWolf\Db;

// Toʻliq oʻyin oqimi API orqali (vaqt "sayohati" bilan: $now qoʻlda suriladi).

$T = 1_790_000_000; // qatʼiy boshlangʻich vaqt
$UID = 777001;

function api(string $method, string $path, array $body = [], ?string $reqId = null, ?int $uid = null): array
{
    global $T, $UID;
    [$path, $qs] = array_pad(explode('?', $path, 2), 2, '');
    parse_str($qs, $query);
    $headers = ['x-dev-user' => (string) ($uid ?? $UID), 'x-client-version' => '1.0.0'];
    if ($method === 'POST') {
        $headers['x-request-id'] = $reqId ?? sprintf('%08x-0000-4000-8000-%012x', random_int(0, 0xffffffff), random_int(0, 0xffffffffff));
    }
    [$code, $out] = Api::dispatch($method, $path, $query, $body, $headers, $T);
    $out['_code'] = $code;
    return $out;
}

function must(array $r, string $name): array
{
    ok($r['ok'] === true, $name, $r['error'] ?? null);
    return $r['data'] ?? [];
}

function queueOf(array $r, string $kind): ?array
{
    foreach ($r['state']['queues'] as $q) {
        if ($q['kind'] === $kind) {
            return $q;
        }
    }
    return null;
}

function step(int $n): array
{
    return api('POST', '/tutorial/step', ['step' => $n]);
}

function freeFinish(array $r, string $kind): void
{
    $q = queueOf($r, $kind);
    ok($q !== null, "$kind navbati bor");
    if ($q) {
        must(api('POST', '/queue/speedup', ['queue_id' => $q['id'], 'free' => true]), "bepul tezlashtirish ($kind)");
    }
}

// --- 1. Yangi oʻyinchi
$s = must(api('GET', '/state'), 'GET /state (yangi oʻyinchi)');
ok($s['player']['level'] === 1 && $s['player']['tutorial_step'] === 0, 'Boshlangʻich daraja 1, qadam 0', $s['player']);
ok(count($s['buildings']) === 9, '9 ta bino');
ok($s['resources']['stone'] === 200, 'Boshlangʻich tosh 200', $s['resources']);

// --- 2. Tanishtiruv 1–3 (ov)
must(step(1), 'qadam 1');
$r = step(2);
ok(!$r['ok'] && $r['error']['code'] === 'TUTORIAL_CHECK', 'qadam 2 ovsiz rad etiladi');
$r = api('POST', '/hunt', ['prey' => 'rodent']);
$h = must($r, 'POST /hunt rodent');
ok($h['seconds'] === 5, 'Tanishtiruv ovi 5 soniya', $h);
ok(api('POST', '/hunt', ['prey' => 'rodent'])['error']['code'] === 'QUEUE_BUSY', 'Alfa ovda — ikkinchi ov rad');
ok(api('POST', '/hunt', ['prey' => 'gazelle'])['error']['code'] === 'LEVEL_TOO_LOW', 'Jayron 1-darajada yopiq');
$T += 6;
must(step(2), 'qadam 2');
must(step(3), 'qadam 3');
$s = must(api('GET', '/state'), 'state');
ok($s['player']['level'] === 2, '3-qadamdan keyin daraja 2', $s['player']['level']);
ok($s['player']['xp'] >= 30, 'XP ≥ 30');

// --- 3. Binolar va bepul tezlashtirish
$r = api('POST', '/buildings/upgrade', ['type' => 'den']);
ok($r['error']['code'] === 'DEN_AUTO_LEVEL', 'In navbat orqali qurilmaydi');
$r = api('POST', '/buildings/upgrade', ['type' => 'workshop']);
must($r, 'Ustaxona L2');
ok(api('POST', '/buildings/upgrade', ['type' => 'food_cave'])['error']['code'] === 'QUEUE_BUSY', '1 ta qurilish navbati');
$q = queueOf($r, 'build');
must(api('POST', '/queue/cancel', ['queue_id' => $q['id']]), 'Navbatni bekor qilish');
$s = must(api('GET', '/state'), 'state');
ok($s['resources']['stone'] === 200 - 60 + 48, 'Bekor qilish 80% qaytaradi', $s['resources']['stone']);

$r = api('POST', '/buildings/upgrade', ['type' => 'food_cave']);
freeFinish($r, 'build');
must(step(4), 'qadam 4 (Oziq gʻori L2)');
must(step(5), 'qadam 5');
$r = api('POST', '/buildings/upgrade', ['type' => 'workshop']);
freeFinish($r, 'build');
must(step(6), 'qadam 6 (Ustaxona L2)');
ok(api('POST', '/profile/allocation', ['stone' => 50, 'wood' => 50, 'bone' => 1])['error']['code'] === 'BAD_REQUEST',
    'Taqsimot yigʻindisi 100 boʻlishi shart');
must(api('POST', '/profile/allocation', ['stone' => 50, 'wood' => 30, 'bone' => 20]), 'Taqsimot');
must(step(7), 'qadam 7');
$r = api('POST', '/buildings/upgrade', ['type' => 'hunt_path']);
freeFinish($r, 'build');
must(step(8), 'qadam 8 (Ov soʻqmogʻi)');

// --- 4. Mashq
$r = api('POST', '/army/train', ['role' => 'attacker', 'tier' => 1, 'qty' => 1]);
ok($r['error']['code'] === 'LEVEL_TOO_LOW', 'Hujumchi 3-darajada yopiq');
$r = api('POST', '/army/train', ['role' => 'hunter', 'tier' => 1, 'qty' => 2]);
ok($r['error']['code'] === 'CAPACITY_FULL', '1–3 daraja qoʻshin sigʻimi 1');
$r = api('POST', '/army/train', ['role' => 'hunter', 'tier' => 1, 'qty' => 1]);
must($r, 'Ovchi mashqi');
must(step(9), 'qadam 9 (ovchi navbatda)');
freeFinish($r, 'train');
$r = api('POST', '/buildings/upgrade', ['type' => 'food_cave']);
freeFinish($r, 'build');
must(step(10), 'qadam 10');
must(step(11), 'qadam 11 (toʻda)');
$s = must(api('GET', '/state'), 'state');
ok($s['player']['level'] === 4, '11-qadamdan keyin daraja 4', $s['player']['level']);
ok($s['player']['army']['count'] === 4 && $s['player']['army']['cap'] === 10, '1 + 3 ovchi, sigʻim 10', $s['player']['army']);

// --- 5. Toʻda ovi
$r = api('POST', '/hunt', ['prey' => 'marmot']);
ok($r['error']['code'] === 'NOT_ENOUGH_ARMY', 'Sugʻur yolgʻiz ovlanmaydi');
$r = api('POST', '/hunt', ['prey' => 'marmot', 'payload' => [['role' => 'hunter', 'tier' => 1, 'qty' => 2]]]);
must($r, 'Sugʻur toʻda bilan');
ok($r['state']['player']['army']['count'] === 4, 'Ovchilar yurishda ham sanaladi');
$T += 6;
must(api('POST', '/hunt', ['prey' => 'rabbit']), 'Quyon');
$T += 6;
must(step(12), 'qadam 12 (3 ov)');

// Resurs yetishmasligi va XP
Db::exec('UPDATE player_resources SET meat = 100, stone = 500, bone = 300, wood = 300 WHERE player_id = (SELECT id FROM players WHERE tg_id = ?)', [$UID]);
$r = api('POST', '/buildings/upgrade', ['type' => 'battle_ground']);
freeFinish($r, 'build');
must(step(13), 'qadam 13 (Jang maydoni)');
$r = api('POST', '/army/train', ['role' => 'attacker', 'tier' => 1, 'qty' => 1]);
must($r, 'Hujumchi mashqi');
freeFinish($r, 'train');
must(step(14), 'qadam 14');
must(step(15), 'qadam 15');
$b = must(step(16), 'qadam 16 (bot jangi)');
ok(($b['battle']['result'] ?? '') === 'attacker_win', 'Mashq jangi — gʻalaba', $b['battle']['result'] ?? null);
ok(count($b['battle']['log'] ?? []) === 6, 'Jang jurnali 6 qator');
$s = must(api('GET', '/state'), 'state');
ok($s['player']['level'] === 5, '16-qadamdan keyin daraja 5', $s['player']['level']);
$r = api('POST', '/buildings/upgrade', ['type' => 'scout_rock']);
freeFinish($r, 'build');
must(step(17), 'qadam 17');
$d = must(step(18), 'qadam 18 (razvedka)');
ok(($d['report']['grade'] ?? '') === 'exact', 'Razvedka hisoboti aniq');
// Goʻsht kam — 5-darajada toʻda bilan jayron ovlanadi
must(api('POST', '/hunt', ['prey' => 'gazelle', 'payload' => [['role' => 'hunter', 'tier' => 1, 'qty' => 3]]]), 'Jayron (toʻda)');
$T += 6;
$r = api('POST', '/buildings/upgrade', ['type' => 'defense_wall']);
ok($r['ok'], 'Himoya devori', $r['error'] ?? null);
if ($r['ok']) {
    $q = queueOf($r, 'build');
    $T = (int) strtotime(str_replace(['T', 'Z'], [' ', ''], $q['ends_at']) . ' UTC') + 1;
}
must(step(19), 'qadam 19 (navbat vaqt bilan tugadi)');
must(step(20), 'qadam 20');
$s = must(api('GET', '/state'), 'state');
ok($s['player']['tutorial_step'] === 20 && $s['resources']['meat'] >= 500, 'Tanishtiruv tugadi, yakuniy paket', $s['resources']['meat']);

// --- 6. Idempotentlik
$rid = '11111111-2222-4333-8444-555555555555';
$a = api('POST', '/buildings/collect', [], $rid);
$b = api('POST', '/buildings/collect', [], $rid);
ok($a['ok'] && json_encode($a['data']) === json_encode($b['data']), 'Takroriy X-Request-Id — bir xil javob');
ok(api('POST', '/buildings/collect', [], 'bad')['error']['code'] === 'REQUEST_ID_REQUIRED', 'X-Request-Id tekshiruvi');

// --- 7. Ustaxona accrual (1 soat oflayn: 70%)
must(api('POST', '/buildings/collect'), 'collect');
$T += 3600;
$s = must(api('GET', '/state'), 'state 1 soatdan keyin');
$ws = array_sum($s['resources']['workshop']);
$rate = $s['resources']['rates']['workshop_per_h'];
// 5 daqiqa onlayn (100%) + 55 daqiqa oflayn (70%)
near((float) $ws, $rate * (5 / 60 + 55 / 60 * 0.7), 2.0, 'Ustaxona yigʻimi onlayn+oflayn');
ok(isset($s['offline_report']) && $s['offline_report']['away_seconds'] === 3600, 'Qaytish hisoboti');

// --- 8. Ochlik
Db::exec('UPDATE player_resources SET meat = 0.01 WHERE player_id = (SELECT id FROM players WHERE tg_id = ?)', [$UID]);
$T += 600;
$s = must(api('GET', '/state'), 'state (goʻsht tugadi)');
ok($s['player']['hunger'] === true, 'Ochlik rejimi');
$r = api('POST', '/hunt', ['prey' => 'gazelle', 'payload' => [['role' => 'hunter', 'tier' => 1, 'qty' => 3]]]);
$h = must($r, 'Jayron ovi (toʻda 4)');
ok($h['seconds'] === 60 + 25 * 6, 'Ov vaqti = 60s + 6s/kg', $h['seconds'] ?? null);
$T += $h['seconds'] ?? 0;
$s = must(api('GET', '/state'), 'state');
ok($s['player']['hunger'] === false, 'Goʻsht kelishi bilan ochlik oʻchadi');

// --- 9. PvP (bot bilan)
$pid = (int) Db::val('SELECT id FROM players WHERE tg_id = ?', [$UID]);
Db::exec('INSERT INTO army (player_id, role, tier, alive) VALUES (?, "attacker", 1, 6) ON DUPLICATE KEY UPDATE alive = alive + 6', [$pid]);
$t = must(api('GET', '/pvp/targets'), 'GET /pvp/targets');
ok(count($t['targets']) === 9, '9 ta raqib', count($t['targets']));
$lv = array_unique(array_column($t['targets'], 'level'));
ok(min($lv) >= 4 && max($lv) <= 6, 'Hujum oynasi ±1 (daraja 5)', $lv);
$target = $t['targets'][0];
$r = api('POST', '/pvp/attack', ['target_id' => 999999, 'payload' => [['role' => 'attacker', 'tier' => 1, 'qty' => 1]]]);
ok($r['error']['code'] === 'OUT_OF_WINDOW', 'Roʻyxatdan tashqari raqib');
$r = api('POST', '/pvp/attack', ['target_id' => $target['id'], 'payload' => [['role' => 'attacker', 'tier' => 1, 'qty' => 50]]]);
ok($r['error']['code'] === 'NOT_ENOUGH_ARMY', 'Yetarli askar yoʻq');
$r = api('POST', '/pvp/attack', ['target_id' => $target['id'], 'payload' => [['role' => 'attacker', 'tier' => 1, 'qty' => 7]]]);
$m = must($r, 'Hujum');
ok(count($r['state']['marches']) === 1, 'Yurish koʻrinadi');
$arr = (int) strtotime(str_replace(['T', 'Z'], [' ', ''], $m['arrives_at']) . ' UTC');
$T = $arr + 1;
$bl = must(api('GET', '/battles'), 'Jang jurnali');
ok(count($bl['battles']) >= 1 && $bl['battles'][0]['kind'] === 'bot', 'Bot jangi yozildi', $bl['battles'][0] ?? null);
$full = must(api('GET', '/battles/' . $bl['battles'][0]['id']), 'Toʻliq hisobot');
ok(count($full['log']) === 6, 'Raund jurnali');
$s = must(api('GET', '/state'), 'state');
ok(($s['marches'][0]['state'] ?? '') === 'returning', 'Qaytish yoʻlida', $s['marches'][0] ?? null);
$T = (int) strtotime(str_replace(['T', 'Z'], [' ', ''], $s['marches'][0]['returns_at']) . ' UTC') + 1;
$s = must(api('GET', '/state'), 'state (qaytdi)');
ok(count($s['marches']) === 0, 'Yurish tugadi');
$army = $s['army']['roles'][1];
ok($army['role'] === 'attacker' && $army['tiers'][0]['on_march'] === 0, 'Askarlar inga qaytdi', $army['tiers'][0]);

// --- 10. Pair limit
for ($i = 0; $i < 2; $i++) {
    $alive = (int) Db::val('SELECT alive FROM army WHERE player_id = ? AND role = "attacker" AND tier = 1', [$pid]);
    if ($alive < 1) {
        Db::exec('UPDATE army SET alive = 3 WHERE player_id = ? AND role = "attacker" AND tier = 1', [$pid]);
    }
    must(api('POST', '/pvp/attack', ['target_id' => $target['id'], 'payload' => [['role' => 'attacker', 'tier' => 1, 'qty' => 1]]]),
        'Takroriy hujum ' . ($i + 2));
}
Db::exec('UPDATE army SET alive = alive + 1 WHERE player_id = ? AND role = "attacker" AND tier = 1', [$pid]);
Db::exec('UPDATE players SET offers_attacks = 0 WHERE id = ?', [$pid]);
$r = api('POST', '/pvp/attack', ['target_id' => $target['id'], 'payload' => [['role' => 'attacker', 'tier' => 1, 'qty' => 1]]]);
ok(!$r['ok'] && in_array($r['error']['code'], ['PAIR_LIMIT', 'OUT_OF_WINDOW'], true), 'Kuniga 3 hujum chegarasi', $r['error'] ?? null);

// --- 11. Ikkinchi real oʻyinchi: yangi oʻyinchi qalqon ostida
$UID2 = 777002;
must(api('GET', '/state', [], null, $UID2), 'Ikkinchi oʻyinchi');
$p2 = Db::one('SELECT * FROM players WHERE tg_id = ?', [$UID2]);
ok(\BlueWolf\Game::isShielded($p2, $T), 'Yangi oʻyinchi (1–6) qalqon ostida');

// --- 12. Vazifalar
$q = must(api('GET', '/quests'), 'GET /quests');
$login = array_values(array_filter($q['daily'], static fn($x) => $x['key'] === 'login'))[0];
ok($login['progress'] === 1, 'Kirish bonusi bajarilgan');
$c = must(api('POST', '/quests/' . $login['id'] . '/claim'), 'Mukofot olish');
ok(($c['reward']['meat'] ?? 0) > 0, 'Goʻsht mukofoti', $c);
ok(api('POST', '/quests/' . $login['id'] . '/claim')['ok'] === false, 'Ikki marta olinmaydi');

// --- 13. v2 boʻlimlari va auth
ok(api('GET', '/clans/search')['_code'] === 501, 'Klan — v2 (501)');
[$code] = Api::dispatch('GET', '/state', [], [], [], $T);
ok($code === 401, 'initData yoʻq — 401');
$init = \BlueWolf\Auth::sign(['auth_date' => (string) $T, 'user' => json_encode(['id' => 555, 'first_name' => 'Ali'])], '123456:TEST');
[$code, $out] = Api::dispatch('GET', '/state', [], [], ['x-init-data' => $init], $T);
ok($code === 200 && $out['data']['player']['name'] === 'Ali', 'Imzolangan initData qabul qilinadi', $out['error'] ?? null);
[$code] = Api::dispatch('GET', '/state', [], [], ['x-init-data' => $init . 'x'], $T);
ok($code === 401, 'Buzilgan imzo — 401');
[$code] = Api::dispatch('GET', '/state', [], [], ['x-init-data' => $init], $T + 90000);
ok($code === 401, 'Eskirgan initData — 401');
