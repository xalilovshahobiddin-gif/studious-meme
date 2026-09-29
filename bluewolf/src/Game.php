<?php
declare(strict_types=1);

namespace BlueWolf;

/**
 * Oʻyinchi holati: yaratish, qulflash, voqealarni vaqt tartibida qayta ishlash
 * (tick yoʻq — timestamp accrual, texnik spec 4.1–4.2) va snapshot.
 *
 * $ctx = [
 *   'p'    => players qatori, 'r' => player_resources qatori,
 *   'b'    => [bino_turi => daraja],
 *   'army' => ['role:tier' => [role, tier, alive, on_march, injured]],
 * ]
 */
final class Game
{
    public const RES = ['meat', 'water', 'herb', 'stone', 'wood', 'hide', 'bone'];

    // ================================================================ yaratish

    public static function createPlayer(array $tg, int $now): int
    {
        return Db::tx(function () use ($tg, $now) {
            $lang = in_array($tg['language_code'] ?? '', ['uz', 'ru', 'en'], true) ? $tg['language_code'] : 'uz';
            $name = trim(($tg['first_name'] ?? '') . ' ' . ($tg['last_name'] ?? '')) ?: ('Boʻri ' . ($tg['id'] % 10000));
            [$x, $y] = self::randomSpot();
            $pid = Db::insert('players', [
                'tg_id' => $tg['id'], 'tg_username' => $tg['username'] ?? null,
                'display_name' => mb_substr($name, 0, 48), 'lang' => $lang, 'x' => $x, 'y' => $y,
                'free_speedups' => Config::int('tutorial_free_speedups'),
                'created_at' => Db::dt($now), 'last_seen_at' => Db::dt($now),
            ]);
            self::initEconomy($pid, $now, [
                'meat' => Config::get('start_meat'), 'stone' => Config::get('start_stone'),
                'wood' => Config::get('start_wood'), 'hide' => Config::get('start_hide'),
                'bone' => Config::get('start_bone'), 'moonstone' => Config::int('start_moonstone'),
            ]);
            Analytics::log($pid, 'player_created', ['lang' => $lang]);
            return $pid;
        });
    }

    /** Resurs qatori + 9 bino (hammasi 1-daraja; In — oʻyinchi darajasi bilan sinxron). */
    public static function initEconomy(int $pid, int $now, array $res, int $bldLevel = 1): void
    {
        Db::insert('player_resources', $res + ['player_id' => $pid, 'last_tick_at' => Db::dt($now)]);
        foreach (F::BUILDINGS as $type) {
            Db::insert('buildings', ['player_id' => $pid, 'type' => $type, 'level' => $bldLevel]);
        }
    }

    public static function randomSpot(): array
    {
        $size = Config::int('map_size_km');
        return [random_int(0, $size), random_int(0, $size)];
    }

    // ================================================================ yuklash / saqlash

    public static function lock(int $pid): array
    {
        $p = Db::one('SELECT * FROM players WHERE id = ? FOR UPDATE', [$pid]);
        if ($p === null) {
            throw new ApiError('NOT_FOUND', 'Oʻyinchi topilmadi');
        }
        $r = Db::one('SELECT * FROM player_resources WHERE player_id = ? FOR UPDATE', [$pid]);
        $b = [];
        foreach (Db::all('SELECT type, level FROM buildings WHERE player_id = ?', [$pid]) as $row) {
            $b[$row['type']] = (int) $row['level'];
        }
        $army = [];
        foreach (Db::all('SELECT * FROM army WHERE player_id = ?', [$pid]) as $row) {
            $army[$row['role'] . ':' . $row['tier']] = [
                'role' => $row['role'], 'tier' => (int) $row['tier'], 'alive' => (int) $row['alive'],
                'on_march' => (int) $row['on_march'], 'injured' => (int) $row['injured'],
            ];
        }
        foreach (self::RES as $k) {
            $r[$k] = (float) $r[$k];
        }
        foreach (F::WORKSHOP_RES as $k) {
            $r["ws_$k"] = (float) $r["ws_$k"];
        }
        $r['moonstone'] = (int) $r['moonstone'];
        $p['level'] = (int) $p['level'];
        $p['xp'] = (int) $p['xp'];
        return ['p' => $p, 'r' => $r, 'b' => $b, 'army' => $army, 'b0' => $b];
    }

    public static function save(array &$ctx): void
    {
        $p = $ctx['p'];
        Db::update('players', [
            'level' => $p['level'], 'xp' => $p['xp'], 'shield_until' => $p['shield_until'],
            'hunger_since' => $p['hunger_since'], 'hunger_lost_pct' => $p['hunger_lost_pct'],
            'free_speedups' => $p['free_speedups'], 'tutorial_step' => $p['tutorial_step'],
            'def_loss_streak' => $p['def_loss_streak'], 'offers_attacks' => $p['offers_attacks'],
            'stat_hunts' => $p['stat_hunts'], 'stat_battles' => $p['stat_battles'], 'stat_wins' => $p['stat_wins'],
            'second_queue' => $p['second_queue'],
        ], 'id = ?', [$p['id']]);
        $r = $ctx['r'];
        $set = ['moonstone' => $r['moonstone'], 'last_tick_at' => $r['last_tick_at']];
        foreach (self::RES as $k) {
            $set[$k] = round(max(0.0, $r[$k]), 4);
        }
        foreach (F::WORKSHOP_RES as $k) {
            $set["ws_$k"] = round(max(0.0, $r["ws_$k"]), 4);
            $set["alloc_$k"] = $r["alloc_$k"];
        }
        Db::update('player_resources', $set, 'player_id = ?', [$p['id']]);
        foreach ($ctx['b'] as $type => $lvl) {
            if (($ctx['b0'][$type] ?? null) !== $lvl) {
                Db::exec('UPDATE buildings SET level = ? WHERE player_id = ? AND type = ?', [$lvl, $p['id'], $type]);
            }
        }
        $ctx['b0'] = $ctx['b'];
        foreach ($ctx['army'] as $a) {
            Db::exec('INSERT INTO army (player_id, role, tier, alive, on_march, injured) VALUES (?, ?, ?, ?, ?, ?)
                      ON DUPLICATE KEY UPDATE alive = VALUES(alive), on_march = VALUES(on_march), injured = VALUES(injured)',
                [$p['id'], $a['role'], $a['tier'], max(0, $a['alive']), max(0, $a['on_march']), max(0, $a['injured'])]);
        }
    }

    // ================================================================ sinxronlash

    /**
     * Soʻrov boshida: avval shu oʻyinchiga tegishli yetib kelgan yurishlar (jang/razvedka)
     * hal qilinadi, keyin oʻz voqealari `now` gacha qayta ishlanadi.
     */
    public static function sync(int $pid, int $now): void
    {
        Pvp::resolveDue($pid, $now);
        Db::tx(function () use ($pid, $now) {
            $ctx = self::lock($pid);
            self::processEvents($ctx, $now);
            self::save($ctx);
        });
    }

    /** Oʻz voqealari (navbat, ov, yurishdan qaytish) vaqt tartibida; har biridan oldin accrual. */
    public static function processEvents(array &$ctx, int $to): void
    {
        $pid = $ctx['p']['id'];
        $guard = 0;
        while ($guard++ < 500) {
            $toDt = Db::dt($to);
            $cands = [];
            $q = Db::one("SELECT *, 'queue' AS ev, ends_at AS at FROM queues
                          WHERE player_id = ? AND state = 'running' AND ends_at <= ? ORDER BY ends_at, id LIMIT 1", [$pid, $toDt]);
            if ($q) {
                $cands[] = $q;
            }
            $h = Db::one("SELECT *, 'hunt' AS ev, ends_at AS at FROM hunts
                          WHERE player_id = ? AND state = 'running' AND ends_at <= ? ORDER BY ends_at, id LIMIT 1", [$pid, $toDt]);
            if ($h) {
                $cands[] = $h;
            }
            $m = Db::one("SELECT *, 'return' AS ev, returns_at AS at FROM marches
                          WHERE player_id = ? AND state IN ('returning','recalled') AND returns_at <= ?
                          ORDER BY returns_at, id LIMIT 1", [$pid, $toDt]);
            if ($m) {
                $cands[] = $m;
            }
            if (!$cands) {
                break;
            }
            usort($cands, static fn($a, $b) => strcmp($a['at'], $b['at']));
            $ev = $cands[0];
            $at = Db::ts($ev['at']);
            Economy::accrue($ctx, $at);
            match ($ev['ev']) {
                'queue' => Queues::complete($ctx, $ev, $at),
                'hunt' => Hunt::complete($ctx, $ev, $at),
                'return' => Pvp::completeReturn($ctx, $ev, $at),
            };
        }
        Economy::accrue($ctx, $to);
    }

    // ================================================================ yordamchilar

    public static function &unit(array &$ctx, string $role, int $tier): array
    {
        $k = "$role:$tier";
        if (!isset($ctx['army'][$k])) {
            $ctx['army'][$k] = ['role' => $role, 'tier' => $tier, 'alive' => 0, 'on_march' => 0, 'injured' => 0];
        }
        return $ctx['army'][$k];
    }

    /** Jami askar (sigʻim hisobida): sogʻ + yurishda + jarohatlangan. */
    public static function soldiers(array $ctx, bool $withInjured = true): int
    {
        $n = 0;
        foreach ($ctx['army'] as $a) {
            $n += $a['alive'] + $a['on_march'] + ($withInjured ? $a['injured'] : 0);
        }
        return $n;
    }

    public static function roleCount(array $ctx, string $role): int
    {
        $n = 0;
        foreach ($ctx['army'] as $a) {
            if ($a['role'] === $role) {
                $n += $a['alive'] + $a['on_march'] + $a['injured'];
            }
        }
        return $n;
    }

    /** Inda turgan sogʻ askarlar guruhlari (himoya uchun). */
    public static function homeGroups(array $ctx): array
    {
        $g = [];
        foreach ($ctx['army'] as $a) {
            if ($a['alive'] > 0) {
                $g[] = ['role' => $a['role'], 'tier' => $a['tier'], 'qty' => $a['alive']];
            }
        }
        return $g;
    }

    public static function hasRes(array $ctx, array $cost): bool
    {
        foreach ($cost as $k => $v) {
            if (($ctx['r'][$k] ?? 0) + 1e-6 < $v) {
                return false;
            }
        }
        return true;
    }

    public static function spend(array &$ctx, array $cost): void
    {
        if (!self::hasRes($ctx, $cost)) {
            $missing = [];
            foreach ($cost as $k => $v) {
                if (($ctx['r'][$k] ?? 0) + 1e-6 < $v) {
                    $missing[$k] = (int) ceil($v - $ctx['r'][$k]);
                }
            }
            throw new ApiError('NOT_ENOUGH_RESOURCES', 'Resurs yetarli emas', ['missing' => $missing]);
        }
        foreach ($cost as $k => $v) {
            $ctx['r'][$k] -= $v;
        }
    }

    /** Mukofot / oʻlja qoʻshish. Goʻsht ovdan boshqa manbadan ombor sigʻimidan oshishi mumkin. */
    public static function give(array &$ctx, array $res, ?int $at = null): void
    {
        foreach ($res as $k => $v) {
            if ($k === 'moonstone') {
                $ctx['r'][$k] += (int) $v;
            } elseif (in_array($k, self::RES, true)) {
                $ctx['r'][$k] += $v;
            }
        }
        if (($res['meat'] ?? 0) > 0) {
            Economy::fed($ctx);
        }
    }

    /** XP qoʻshish va daraja koʻtarilishi (In darajasi avtomatik sinxron — GDD bo'lim 5). */
    public static function addXp(array &$ctx, float $xp, int $at): void
    {
        if ($xp <= 0) {
            return;
        }
        $ctx['p']['xp'] += (int) round($xp);
        $max = Config::int('max_level');
        while ($ctx['p']['level'] < $max && $ctx['p']['xp'] >= F::xpTotal($ctx['p']['level'] + 1)) {
            $ctx['p']['level']++;
            Analytics::log((int) $ctx['p']['id'], 'level_up', ['level' => $ctx['p']['level']]);
        }
        $ctx['b']['den'] = $ctx['p']['level'];
    }

    public static function setLevelAtLeast(array &$ctx, int $level, int $at): void
    {
        $level = min($level, Config::int('max_level'));
        if ($ctx['p']['level'] < $level) {
            self::addXp($ctx, F::xpTotal($level) - $ctx['p']['xp'], $at);
        }
    }

    public static function isShielded(array $p, int $now): bool
    {
        if ((int) ($p['is_bot'] ?? 0) === 1) {
            return false;
        }
        if ((int) $p['level'] <= Config::int('shield_newbie_level')) {
            return true;
        }
        if ($p['shield_until'] !== null && Db::ts($p['shield_until']) > $now) {
            return true;
        }
        // Uyqu qalqoni: 72 soat oflayn
        return $now - Db::ts($p['last_seen_at']) >= Config::get('sleep_shield_h') * 3600;
    }

    public static function cp(array $ctx): int
    {
        $lvl = $ctx['p']['level'];
        $ep = Config::level($lvl)['cp'];
        foreach ($ctx['army'] as $a) {
            $ep += ($a['alive'] + $a['on_march']) * F::tierCp($a['role'], $a['tier'], $lvl);
        }
        if ($ctx['p']['hunger_since'] !== null) {
            $ep *= 1 - Config::get('hunger_cp_penalty');
        }
        return (int) round($ep);
    }

    // ================================================================ snapshot

    public static function snapshot(int $pid, int $now, bool $full = false): array
    {
        $ctx = self::lockless($pid);
        $p = $ctx['p'];
        $r = $ctx['r'];
        $lvl = $p['level'];
        $b = $ctx['b'];
        $mouths = max(1, self::soldiers($ctx));
        $lv = Config::level($lvl);
        $next = min(count(Config::data('levels')), $lvl + 1);
        $res = [];
        foreach (self::RES as $k) {
            $res[$k] = (int) floor($r[$k]);
        }
        $res['moonstone'] = $r['moonstone'];
        $ws = [];
        foreach (F::WORKSHOP_RES as $k) {
            $ws[$k] = (int) floor($r["ws_$k"]);
        }
        $state = [
            'player' => [
                'id' => (int) $p['id'], 'name' => $p['display_name'], 'level' => $lvl, 'xp' => $p['xp'],
                'xp_level' => F::xpTotal($lvl), 'xp_next' => $lvl >= Config::int('max_level') ? null : F::xpTotal($next),
                'max_level' => Config::int('max_level'),
                'wolf' => ['name' => $lv['name'], 'sci' => $lv['sci'], 'class' => $lv['class'], 'weight' => $lv['weight'],
                    'power' => $lv['power'], 'speed' => $lv['speed'], 'hp' => $lv['hp'], 'cp' => $lv['cp']],
                'cp' => self::cp($ctx), 'tutorial_step' => (int) $p['tutorial_step'],
                'free_speedups' => (int) $p['free_speedups'], 'second_queue' => (int) $p['second_queue'],
                'shield_until' => self::iso($p['shield_until']),
                'shielded' => self::isShielded($p, $now),
                'hunger' => $p['hunger_since'] !== null,
                'army' => ['count' => self::soldiers($ctx), 'cap' => F::armyCap($lvl)],
                'lang' => $p['lang'],
            ],
            'resources' => $res + [
                'workshop' => $ws,
                'alloc' => ['stone' => (int) $r['alloc_stone'], 'wood' => (int) $r['alloc_wood'],
                    'hide' => (int) $r['alloc_hide'], 'bone' => (int) $r['alloc_bone']],
                'caps' => ['food' => (int) floor(F::foodCap($b['food_cave'])),
                    'workshop' => (int) floor(F::workshopCap($b['workshop']))],
                'rates' => [
                    'meat_per_h' => -round(F::meatNeed($lvl) * $mouths / 24, 2),
                    'water_per_h' => round(F::waterRate($b['food_cave']), 1),
                    'workshop_per_h' => round(F::workshopRate($b['workshop']), 1),
                ],
            ],
            'queues' => array_map([self::class, 'queueOut'], Db::all(
                "SELECT * FROM queues WHERE player_id = ? AND state = 'running' ORDER BY ends_at", [$pid])),
            'hunts' => array_map(static fn($h) => [
                'id' => (int) $h['id'], 'prey' => $h['prey_key'], 'meat' => (float) $h['meat'], 'xp' => (int) $h['xp'],
                'started_at' => self::iso($h['started_at']), 'ends_at' => self::iso($h['ends_at']),
                'payload' => json_decode($h['payload'], true),
            ], Db::all("SELECT * FROM hunts WHERE player_id = ? AND state = 'running'", [$pid])),
            'marches' => array_map([Pvp::class, 'marchOut'], Db::all(
                "SELECT m.*, p.display_name AS target_name FROM marches m LEFT JOIN players p ON p.id = m.target_player
                 WHERE m.player_id = ? AND m.state IN ('outbound','returning','recalled') ORDER BY m.id", [$pid])),
            'incoming' => array_map(static fn($m) => [
                'id' => (int) $m['id'], 'kind' => $m['kind'], 'from' => $m['display_name'],
                'arrives_at' => self::iso($m['arrives_at']),
            ], Db::all("SELECT m.id, m.kind, m.arrives_at, p.display_name FROM marches m JOIN players p ON p.id = m.player_id
                        WHERE m.target_player = ? AND m.state = 'outbound' AND m.kind = 'attack'", [$pid])),
            'server_time' => self::iso(Db::dt($now)),
        ];
        if ($full) {
            $state['buildings'] = Buildings::describe($ctx);
            $state['army'] = Army::describe($ctx);
        }
        return $state;
    }

    /** Qulfsiz oʻqish (snapshot uchun). */
    public static function lockless(int $pid): array
    {
        $p = Db::one('SELECT * FROM players WHERE id = ?', [$pid]);
        $r = Db::one('SELECT * FROM player_resources WHERE player_id = ?', [$pid]);
        $b = [];
        foreach (Db::all('SELECT type, level FROM buildings WHERE player_id = ?', [$pid]) as $row) {
            $b[$row['type']] = (int) $row['level'];
        }
        $army = [];
        foreach (Db::all('SELECT * FROM army WHERE player_id = ?', [$pid]) as $row) {
            $army[$row['role'] . ':' . $row['tier']] = ['role' => $row['role'], 'tier' => (int) $row['tier'],
                'alive' => (int) $row['alive'], 'on_march' => (int) $row['on_march'], 'injured' => (int) $row['injured']];
        }
        foreach (self::RES as $k) {
            $r[$k] = (float) $r[$k];
        }
        foreach (F::WORKSHOP_RES as $k) {
            $r["ws_$k"] = (float) $r["ws_$k"];
        }
        $r['moonstone'] = (int) $r['moonstone'];
        $p['level'] = (int) $p['level'];
        $p['xp'] = (int) $p['xp'];
        return ['p' => $p, 'r' => $r, 'b' => $b, 'army' => $army, 'b0' => $b];
    }

    public static function queueOut(array $q): array
    {
        return [
            'id' => (int) $q['id'], 'kind' => $q['kind'], 'slot' => (int) $q['slot'],
            'building_type' => $q['building_type'], 'target_level' => $q['target_level'] === null ? null : (int) $q['target_level'],
            'role' => $q['role'], 'tier' => $q['tier'] === null ? null : (int) $q['tier'],
            'from_tier' => $q['from_tier'] === null ? null : (int) $q['from_tier'],
            'qty' => $q['qty'] === null ? null : (int) $q['qty'],
            'started_at' => self::iso($q['started_at']), 'ends_at' => self::iso($q['ends_at']),
        ];
    }

    public static function iso(?string $dt): ?string
    {
        return $dt === null ? null : str_replace(' ', 'T', $dt) . 'Z';
    }
}
