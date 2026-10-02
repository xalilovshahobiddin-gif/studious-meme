<?php
declare(strict_types=1);

namespace BlueWolf;

/** PvP: raqiblar roʻyxati, hujum, razvedka, yurishlar (GDD bo'lim 7–9, API bo'lim 6). */
final class Pvp
{
    public const LOOT_RES = ['meat', 'stone', 'wood', 'bone'];

    // ================================================================ raqiblar

    public static function targets(int $pid, int $now, bool $force = false): array
    {
        $me = Game::lockless($pid);
        self::requireUnlocked($me);
        $offers = Db::all('SELECT * FROM match_offers WHERE player_id = ? ORDER BY slot', [$pid]);
        $stale = !$offers || Db::ts($offers[0]['expires_at']) <= $now
            || (int) $me['p']['offers_attacks'] >= Config::int('match_refresh_attacks');
        if ($stale || $force) {
            $offers = self::generate($me, $now);
        }
        $myCp = max(1, Game::cp($me));
        $out = [];
        foreach ($offers as $o) {
            $t = Game::lockless((int) $o['target_id']);
            $scout = Db::one('SELECT grade, expires_at FROM scout_reports WHERE player_id = ? AND target_id = ? AND expires_at > ?
                              ORDER BY id DESC LIMIT 1', [$pid, $o['target_id'], Db::dt($now)]);
            $out[] = [
                'id' => (int) $o['target_id'], 'name' => $t['p']['display_name'], 'level' => $t['p']['level'],
                'wolf' => Config::level($t['p']['level'])['name'],
                'distance_km' => (float) $o['distance_km'], 'power_band' => self::band(Game::cp($t), $myCp),
                'shielded' => Game::isShielded($t['p'], $now), 'is_bot' => (int) $t['p']['is_bot'] === 1,
                'last_seen' => Game::iso($t['p']['last_seen_at']),
                'scouted' => $scout ? $scout['grade'] : null,
                'march_minutes' => (int) round(F::marchSeconds((float) $o['distance_km']) / 60),
                'attacks_today' => self::pairCount($pid, (int) $o['target_id'], $now),
            ];
        }
        return ['targets' => $out, 'expires_at' => Game::iso($offers[0]['expires_at'] ?? null),
            'pair_limit' => Config::int('pair_limit')];
    }

    private static function requireUnlocked(array $ctx): void
    {
        if ($ctx['p']['level'] < Config::int('pack_unlock_level')) {
            throw new ApiError('LEVEL_TOO_LOW', 'PvP 4-darajada ochiladi', ['need_level' => Config::int('pack_unlock_level')]);
        }
    }

    public static function band(int $cp, int $myCp): string
    {
        $r = $cp / $myCp;
        return $r < 1 - Config::get('war_power_window') ? 'weak' : ($r > 1 + Config::get('war_power_window') ? 'strong' : 'even');
    }

    /** 9 ta raqib: −1 / teng / +1 daraja. Real oʻyinchilar yetmasa NPC toʻdalar bilan toʻldiriladi. */
    private static function generate(array $me, int $now): array
    {
        $pid = (int) $me['p']['id'];
        $lvl = $me['p']['level'];
        $lo = $lvl - Config::int('window_low');
        $hi = $lvl + Config::int('window_high');
        $n = Config::int('match_offers');
        $real = Db::all('SELECT id, x, y FROM players WHERE is_bot = 0 AND status = \'active\' AND id <> ?
                         AND level BETWEEN ? AND ? AND level > ? AND tutorial_step >= ?
                         ORDER BY RAND() LIMIT ' . $n,
            [$pid, $lo, $hi, Config::int('shield_newbie_level'), Config::int('tutorial_steps')]);
        $need = $n - count($real);
        $bots = $need > 0 ? Db::all("SELECT id, x, y FROM players WHERE is_bot = 1 AND level BETWEEN ? AND ?
                                     AND display_name <> ? ORDER BY RAND() LIMIT $need",
            [max(1, $lo), $hi, Bots::TUTORIAL_NAME]) : [];
        Db::exec('DELETE FROM match_offers WHERE player_id = ?', [$pid]);
        $exp = Db::dt($now + (int) round(Config::get('match_refresh_min') * 60));
        $slot = 0;
        foreach (array_merge($real, $bots) as $t) {
            $d = max(1.0, round(hypot($t['x'] - $me['p']['x'], $t['y'] - $me['p']['y']), 2));
            Db::insert('match_offers', ['player_id' => $pid, 'slot' => ++$slot, 'target_id' => $t['id'],
                'distance_km' => $d, 'power_band' => 'even', 'generated_at' => Db::dt($now), 'expires_at' => $exp]);
        }
        Db::exec('UPDATE players SET offers_attacks = 0 WHERE id = ?', [$pid]);
        return Db::all('SELECT * FROM match_offers WHERE player_id = ? ORDER BY slot', [$pid]);
    }

    private static function pairCount(int $att, int $def, int $now): int
    {
        return (int) Db::val('SELECT COUNT(*) FROM battles WHERE attacker_id = ? AND defender_id = ? AND created_at > ?',
            [$att, $def, Db::dt($now - 86400)])
            + (int) Db::val("SELECT COUNT(*) FROM marches WHERE player_id = ? AND target_player = ? AND kind = 'attack'
                             AND state = 'outbound'", [$att, $def]);
    }

    private static function offer(int $pid, int $targetId): array
    {
        $o = Db::one('SELECT * FROM match_offers WHERE player_id = ? AND target_id = ?', [$pid, $targetId]);
        if (!$o) {
            // Mavsum janglarida raqibni server tanlaydi — faqat taklif roʻyxatidagilarga hujum
            throw new ApiError('OUT_OF_WINDOW', 'Raqib taklif roʻyxatida yoʻq');
        }
        return $o;
    }

    // ================================================================ hujum va razvedka

    public static function attack(int $pid, int $targetId, mixed $payload, int $now): array
    {
        $o = self::offer($pid, $targetId);
        return Db::tx(function () use ($pid, $targetId, $payload, $now, $o) {
            $ctx = Game::lock($pid);
            self::requireUnlocked($ctx);
            $t = Db::one('SELECT * FROM players WHERE id = ?', [$targetId]);
            $diff = (int) $t['level'] - $ctx['p']['level'];
            if ($diff < -Config::int('window_low') || $diff > Config::int('window_high')) {
                throw new ApiError('OUT_OF_WINDOW', 'Raqib hujum oynasidan tashqarida');
            }
            if (Game::isShielded($t, $now)) {
                throw new ApiError('TARGET_SHIELDED', 'Raqib qalqon ostida');
            }
            if (self::pairCount($pid, $targetId, $now) >= Config::int('pair_limit')) {
                throw new ApiError('PAIR_LIMIT', 'Bu raqibga bugungi hujumlar tugadi');
            }
            $groups = Army::normalizePayload($ctx, $payload);
            Army::move($ctx, $groups, 'alive', 'on_march');
            $sec = F::marchSeconds((float) $o['distance_km']);
            $id = Db::insert('marches', [
                'player_id' => $pid, 'target_player' => $targetId, 'kind' => 'attack', 'payload' => json_encode($groups),
                'distance_km' => $o['distance_km'], 'speed_kmh' => Config::get('march_speed'),
                'departs_at' => Db::dt($now), 'arrives_at' => Db::dt($now + $sec), 'returns_at' => Db::dt($now + 2 * $sec),
            ]);
            $ctx['p']['shield_until'] = null; // oʻzi hujum qilsa qalqon darhol oʻchadi
            $ctx['p']['offers_attacks']++;
            Game::save($ctx);
            if ((int) $t['is_bot'] === 0) {
                Notify::push($targetId, 'attack_incoming', ['from' => $ctx['p']['display_name'],
                    'arrives_at' => Game::iso(Db::dt($now + $sec))], 1);
            }
            return ['march_id' => $id, 'arrives_at' => Game::iso(Db::dt($now + $sec)),
                'returns_at' => Game::iso(Db::dt($now + 2 * $sec))];
        });
    }

    public static function scout(int $pid, int $targetId, mixed $payload, int $now): array
    {
        $o = self::offer($pid, $targetId);
        return Db::tx(function () use ($pid, $targetId, $payload, $now, $o) {
            $ctx = Game::lock($pid);
            self::requireUnlocked($ctx);
            $t = Db::one('SELECT * FROM players WHERE id = ?', [$targetId]);
            if (Game::isShielded($t, $now)) {
                throw new ApiError('TARGET_SHIELDED', 'Raqib qalqon ostida');
            }
            $recent = Db::val('SELECT MAX(created_at) FROM scout_reports WHERE player_id = ? AND target_id = ?', [$pid, $targetId]);
            $pending = (int) Db::val("SELECT COUNT(*) FROM marches WHERE player_id = ? AND target_player = ? AND kind = 'scout'
                                       AND state = 'outbound'", [$pid, $targetId]);
            $cool = (int) round(Config::get('scout_cooldown_min') * 60);
            if ($pending > 0 || ($recent !== null && Db::ts($recent) > $now - $cool)) {
                throw new ApiError('COOLDOWN', 'Razvedka kutish vaqti', ['retry_after' => $recent ? Db::ts($recent) + $cool - $now : $cool]);
            }
            $groups = Army::normalizePayload($ctx, $payload, ['scout']);
            Army::move($ctx, $groups, 'alive', 'on_march');
            $sec = F::marchSeconds((float) $o['distance_km'], true);
            $id = Db::insert('marches', [
                'player_id' => $pid, 'target_player' => $targetId, 'kind' => 'scout', 'payload' => json_encode($groups),
                'distance_km' => $o['distance_km'], 'speed_kmh' => Config::get('scout_speed'),
                'departs_at' => Db::dt($now), 'arrives_at' => Db::dt($now + $sec), 'returns_at' => Db::dt($now + 2 * $sec),
            ]);
            Game::save($ctx);
            return ['march_id' => $id, 'arrives_at' => Game::iso(Db::dt($now + $sec))];
        });
    }

    public static function recall(int $pid, int $mid, int $now): array
    {
        return Db::tx(function () use ($pid, $mid, $now) {
            $m = Db::one("SELECT * FROM marches WHERE id = ? AND player_id = ? FOR UPDATE", [$mid, $pid]);
            if (!$m || $m['state'] !== 'outbound') {
                throw new ApiError('BAD_REQUEST', 'Faqat yoʻldagi yurishni qaytarish mumkin');
            }
            $back = $now + ($now - Db::ts($m['departs_at']));
            Db::exec("UPDATE marches SET state = 'recalled', returns_at = ? WHERE id = ?", [Db::dt($back), $mid]);
            return ['returns_at' => Game::iso(Db::dt($back))];
        });
    }

    // ================================================================ yetib kelish

    /** Shu oʻyinchiga tegishli (yuborgan yoki nishon boʻlgan) yetib kelgan yurishlarni hal qilish. */
    public static function resolveDue(int $pid, int $now): void
    {
        $due = Db::all("SELECT id FROM marches WHERE state = 'outbound' AND arrives_at <= ?
                        AND (player_id = ? OR target_player = ?) ORDER BY arrives_at, id", [Db::dt($now), $pid, $pid]);
        foreach ($due as $row) {
            self::resolveMarch((int) $row['id']);
        }
    }

    public static function resolveMarch(int $mid): void
    {
        Db::tx(function () use ($mid) {
            $m0 = Db::one('SELECT player_id, target_player FROM marches WHERE id = ?', [$mid]);
            // Deadlock oldini olish: oʻyinchilar doim id tartibida qulflanadi
            $ids = [(int) $m0['player_id'], (int) $m0['target_player']];
            sort($ids);
            $ctxs = [];
            foreach ($ids as $id) {
                $ctxs[$id] = Game::lock($id);
            }
            $m = Db::one("SELECT * FROM marches WHERE id = ? AND state = 'outbound' FOR UPDATE", [$mid]);
            if (!$m) {
                return;
            }
            $at = Db::ts($m['arrives_at']);
            $att = &$ctxs[(int) $m['player_id']];
            $def = &$ctxs[(int) $m['target_player']];
            Game::processEvents($att, $at);
            if ((int) $def['p']['is_bot'] === 1) {
                Bots::refresh($def, $at); // botda navbat yoʻq — faqat tiklanish
            } else {
                Game::processEvents($def, $at);
            }
            if ($m['kind'] === 'attack') {
                self::fight($att, $def, $m, $at);
            } else {
                self::scoutArrive($att, $def, $m, $at);
            }
            Game::save($att);
            Game::save($def);
        });
    }

    private static function fight(array &$att, array &$def, array $m, int $at): void
    {
        $aid = (int) $att['p']['id'];
        $did = (int) $def['p']['id'];
        $groups = json_decode($m['payload'], true);
        $scouted = Db::val("SELECT COUNT(*) FROM scout_reports WHERE player_id = ? AND target_id = ? AND grade <> 'fail'
                            AND expires_at > ?", [$aid, $did, Db::dt($at)]) > 0;
        $trap = !$scouted && mt_rand() / mt_getrandmax() < Config::get('trap_chance');
        $defGroups = Game::homeGroups($def);
        $b = Battle::resolve(
            ['groups' => $groups, 'level' => $att['p']['level'], 'hungry' => $att['p']['hunger_since'] !== null],
            ['groups' => $defGroups, 'level' => $def['p']['level'], 'hungry' => $def['p']['hunger_since'] !== null,
                'alpha_cp' => Config::level($def['p']['level'])['cp']],
            $trap,
        );

        // Hujumchi: oʻlganlar yoʻqoladi, jarohatlanganlar qaytishda kasalxonaga
        $survivors = self::subtract($groups, array_merge($b['att_losses']['dead'], $b['att_losses']['injured']));
        foreach ($b['att_losses']['dead'] as $g) {
            Game::unit($att, $g['role'], $g['tier'])['on_march'] -= $g['qty'];
        }
        // Himoyachi: inda
        foreach ($b['def_losses']['dead'] as $g) {
            Game::unit($def, $g['role'], $g['tier'])['alive'] -= $g['qty'];
        }
        foreach ($b['def_losses']['injured'] as $g) {
            $u = &Game::unit($def, $g['role'], $g['tier']);
            $u['alive'] -= $g['qty'];
            $u['injured'] += $g['qty'];
            unset($u);
        }

        $loot = $b['result'] === 'attacker_win' ? self::loot($att, $def, $survivors, $b['full_win'], $at) : [];
        foreach ($loot as $k => $v) {
            $def['r'][$k] -= $v;
        }

        // Qalqon: 30%+ yoʻqotgan himoyachiga 8 soat; ketma-ket 2 magʻlubiyat — 16 soat
        if ($b['result'] === 'attacker_win') {
            $def['p']['def_loss_streak']++;
        } else {
            $def['p']['def_loss_streak'] = 0;
        }
        $shieldH = 0;
        if ($b['def_loss_pct'] >= Config::get('shield_loss_threshold')) {
            $shieldH = Config::get('shield_after_raid_h');
        }
        if ($def['p']['def_loss_streak'] >= 2) {
            $shieldH = max($shieldH, Config::get('shield_streak_h'));
        }
        if ($shieldH > 0 && (int) $def['p']['is_bot'] === 0) {
            $def['p']['shield_until'] = Db::dt($at + (int) round($shieldH * 3600));
        }

        $coef = static fn(string $r) => Config::get('xp_result_' . $r);
        $attRes = $b['result'] === 'attacker_win' ? 'win' : ($b['result'] === 'draw' ? 'draw' : 'loss');
        $defRes = $attRes === 'win' ? 'loss' : ($attRes === 'loss' ? 'win' : 'draw');
        Game::addXp($att, $b['att_damage'] * Config::get('xp_pvp_coef') * $coef($attRes), $at);
        Game::addXp($def, $b['def_damage'] * Config::get('xp_pvp_coef') * $coef($defRes), $at);
        $att['p']['stat_battles']++;
        $def['p']['stat_battles']++;
        if ($attRes === 'win') {
            $att['p']['stat_wins']++;
        } elseif ($defRes === 'win') {
            $def['p']['stat_wins']++;
        }

        $bid = Db::insert('battles', [
            'march_id' => $m['id'], 'kind' => (int) $def['p']['is_bot'] === 1 ? 'bot' : 'pvp', 'trap' => $trap ? 1 : 0,
            'attacker_id' => $aid, 'defender_id' => $did, 'ep_attacker' => $b['ep_attacker'], 'ep_defender' => $b['ep_defender'],
            'ratio' => $b['ratio'], 'rounds' => Config::int('battle_rounds'), 'result' => $b['result'],
            'att_losses' => json_encode($b['att_losses']), 'def_losses' => json_encode($b['def_losses']),
            'loot' => json_encode($loot), 'log' => json_encode($b['log']), 'created_at' => Db::dt($at),
        ]);
        $back = $at + ($at - Db::ts($m['departs_at']));
        Db::update('marches', [
            'state' => 'returning', 'returns_at' => Db::dt($back), 'payload' => json_encode($survivors),
            'loot' => json_encode(['res' => $loot, 'injured' => $b['att_losses']['injured'], 'battle_id' => $bid]),
        ], 'id = ?', [$m['id']]);

        Quests::bump($aid, 'pvp', 1, $at);
        if ((int) $att['p']['stat_battles'] === 1) {
            Analytics::log($aid, 'first_battle', ['result' => $b['result']]);
        }
        Notify::push($aid, 'attack_result', ['battle_id' => $bid, 'result' => $attRes, 'loot' => $loot], 1);
        if ((int) $def['p']['is_bot'] === 0) {
            Notify::push($did, 'attack_result', ['battle_id' => $bid, 'result' => $defRes, 'loot' => $loot], 1);
        }
    }

    /**
     * Oʻlja = zaxira × (1 − Himoya%) × 0.22 × gʻalaba × daraja × takror × qasos, yuk sigʻimidan oshmaydi (GDD bo'lim 8).
     */
    private static function loot(array $att, array $def, array $survivors, bool $full, int $at): array
    {
        $aid = (int) $att['p']['id'];
        $did = (int) $def['p']['id'];
        $nth = 1 + (int) Db::val('SELECT COUNT(*) FROM battles WHERE attacker_id = ? AND defender_id = ? AND created_at > ?',
            [$aid, $did, Db::dt($at - 86400)]);
        $revenge = (int) Db::val('SELECT COUNT(*) FROM battles WHERE attacker_id = ? AND defender_id = ? AND created_at > ?',
            [$did, $aid, Db::dt($at - 86400)]) > 0;
        $away = $at - Db::ts($def['p']['last_seen_at']);
        $k = Config::get('raid_coef')
            * Config::get($full ? 'loot_win_full' : 'loot_win_partial')
            * F::lootDiffCoef($def['p']['level'] - $att['p']['level'])
            * F::repeatCoef($nth)
            * ($revenge ? Config::get('loot_revenge') : 1.0)
            * ((int) $def['p']['is_bot'] === 0 && $away >= 86400 ? Config::get('loot_offline_coef') : 1.0);
        $unprot = 1 - F::protection($def['b']['food_cave']);
        $want = [];
        $total = 0.0;
        foreach (self::LOOT_RES as $res) {
            $want[$res] = max(0.0, $def['r'][$res]) * $unprot * $k;
            $total += $want[$res];
        }
        $carry = 0.0;
        foreach ($survivors as $g) {
            $carry += $g['qty'] * F::carry($g['tier']);
        }
        $scale = $total > $carry && $total > 0 ? $carry / $total : 1.0;
        $out = [];
        foreach ($want as $res => $v) {
            $n = (int) floor($v * $scale);
            if ($n > 0) {
                $out[$res] = $n;
            }
        }
        return $out;
    }

    /** Razvedka kuchi = Σ razvedkachi × tier koeff. × (1 + 0.03 × daraja) */
    public static function scoutPower(array $groups, int $level): float
    {
        $s = 0.0;
        foreach ($groups as $g) {
            if ($g['role'] === 'scout') {
                $s += $g['qty'] * Config::get('tier_coef') ** ($g['tier'] - 1);
            }
        }
        return $s * (1 + Config::get('alpha_bonus') * $level);
    }

    private static function scoutArrive(array &$att, array &$def, array $m, int $at): void
    {
        $aid = (int) $att['p']['id'];
        $did = (int) $def['p']['id'];
        $groups = json_decode($m['payload'], true);
        $mine = self::scoutPower($groups, $att['p']['level']);
        $theirs = self::scoutPower(Game::homeGroups($def), $def['p']['level']);
        $ratio = $theirs > 0 ? $mine / $theirs : 99.0;
        $grade = self::grade($ratio);
        $injured = [];
        if ($grade === 'fail') {
            $injured = Battle::split($groups, Config::get('scout_fail_injury'), 0)['injured'];
            if (!$injured) {
                $injured = [['role' => $groups[0]['role'], 'tier' => $groups[0]['tier'], 'qty' => 1]];
            }
            $groups = self::subtract($groups, $injured);
            if ((int) $def['p']['is_bot'] === 0) {
                Notify::push($did, 'scout_failed', ['from' => $att['p']['display_name']], 2);
            }
        }
        self::writeReport($att, $def, $grade, $ratio, $at);
        $back = $at + ($at - Db::ts($m['departs_at']));
        Db::update('marches', ['state' => 'returning', 'returns_at' => Db::dt($back), 'payload' => json_encode($groups),
            'loot' => json_encode(['res' => [], 'injured' => $injured])], 'id = ?', [$m['id']]);
    }

    public static function grade(float $ratio): string
    {
        // 0.95–1.05 oraligʻida natija 50/50 (GDD bo'lim 9 tavsiyasi)
        if (abs($ratio - Config::get('scout_partial')) < 0.05) {
            return mt_rand(0, 1) === 1 ? 'partial' : 'fail';
        }
        if ($ratio <= Config::get('scout_partial')) {
            return 'fail';
        }
        if ($ratio <= Config::get('scout_full')) {
            return 'partial';
        }
        return $ratio <= Config::get('scout_exact') ? 'full' : 'exact';
    }

    public static function writeReport(array $att, array $def, string $grade, float $ratio, int $at): int
    {
        $data = null;
        $home = Game::homeGroups($def);
        if ($grade !== 'fail') {
            $total = array_sum(array_column($home, 'qty'));
            $data = ['army_total' => $total];
            if ($grade === 'full' || $grade === 'exact') {
                $byRole = [];
                foreach ($home as $g) {
                    $byRole[$g['role']] = ($byRole[$g['role']] ?? 0) + $g['qty'];
                }
                $data['by_role'] = $byRole;
                $unprot = 1 - F::protection($def['b']['food_cave']);
                $noise = $grade === 'exact' ? 0 : Config::get('scout_noise');
                $res = [];
                foreach (self::LOOT_RES as $k) {
                    $res[$k] = (int) round(max(0, $def['r'][$k]) * $unprot * Config::get('raid_coef')
                        * (1 + $noise * (2 * mt_rand() / mt_getrandmax() - 1)));
                }
                $data['loot_estimate'] = $res;
            }
            if ($grade === 'exact') {
                $data['groups'] = $home;
                $data['cp'] = Game::cp($def);
                $data['food_cave'] = $def['b']['food_cave'];
                $data['protection'] = round(F::protection($def['b']['food_cave']), 2);
                $data['shield_until'] = Game::iso($def['p']['shield_until']);
            }
        }
        return Db::insert('scout_reports', [
            'player_id' => $att['p']['id'], 'target_id' => $def['p']['id'], 'ratio' => min(999, round($ratio, 3)),
            'grade' => $grade, 'payload' => json_encode($data), 'created_at' => Db::dt($at),
            'expires_at' => Db::dt($at + (int) round(Config::get('scout_report_min') * 60)),
        ]);
    }

    public static function report(int $pid, int $targetId, int $now): ?array
    {
        $r = Db::one('SELECT r.*, p.display_name FROM scout_reports r JOIN players p ON p.id = r.target_id
                      WHERE r.player_id = ? AND r.target_id = ? ORDER BY r.id DESC LIMIT 1', [$pid, $targetId]);
        if (!$r) {
            return null;
        }
        return ['target_id' => $targetId, 'name' => $r['display_name'], 'grade' => $r['grade'], 'ratio' => (float) $r['ratio'],
            'data' => json_decode((string) $r['payload'], true), 'created_at' => Game::iso($r['created_at']),
            'expires_at' => Game::iso($r['expires_at']), 'valid' => Db::ts($r['expires_at']) > $now];
    }

    /** Uyga qaytish — processEvents ichidan. */
    public static function completeReturn(array &$ctx, array $m, int $at): void
    {
        Db::exec("UPDATE marches SET state = 'done' WHERE id = ?", [$m['id']]);
        Army::move($ctx, json_decode($m['payload'], true) ?: [], 'on_march', 'alive');
        $loot = json_decode((string) $m['loot'], true) ?: [];
        Army::move($ctx, $loot['injured'] ?? [], 'on_march', 'injured');
        $res = $loot['res'] ?? [];
        if (isset($res['meat'])) {
            $res['meat'] = max(0.0, min($res['meat'], F::foodCap($ctx['b']['food_cave']) - $ctx['r']['meat']));
        }
        Game::give($ctx, $res);
    }

    private static function subtract(array $groups, array $minus): array
    {
        $out = [];
        foreach ($groups as $g) {
            foreach ($minus as $x) {
                if ($x['role'] === $g['role'] && (int) $x['tier'] === (int) $g['tier']) {
                    $g['qty'] -= $x['qty'];
                }
            }
            if ($g['qty'] > 0) {
                $out[] = $g;
            }
        }
        return $out;
    }

    // ================================================================ jurnal

    public static function battles(int $pid, int $limit, ?int $cursor): array
    {
        $limit = max(1, min(50, $limit));
        $rows = Db::all('SELECT b.*, a.display_name AS att_name, d.display_name AS def_name, a.level AS att_level, d.level AS def_level
                         FROM battles b JOIN players a ON a.id = b.attacker_id JOIN players d ON d.id = b.defender_id
                         WHERE (b.attacker_id = ? OR b.defender_id = ?)' . ($cursor ? ' AND b.id < ' . (int) $cursor : '') .
            ' ORDER BY b.id DESC LIMIT ' . $limit, [$pid, $pid]);
        $out = array_map(static fn($b) => self::battleOut($b, $pid, false), $rows);
        return ['battles' => $out, 'cursor' => count($rows) === $limit ? (int) end($rows)['id'] : null];
    }

    public static function battle(int $pid, int $id): array
    {
        $b = Db::one('SELECT b.*, a.display_name AS att_name, d.display_name AS def_name, a.level AS att_level, d.level AS def_level
                      FROM battles b JOIN players a ON a.id = b.attacker_id JOIN players d ON d.id = b.defender_id
                      WHERE b.id = ? AND (b.attacker_id = ? OR b.defender_id = ?)', [$id, $pid, $pid]);
        if (!$b) {
            throw new ApiError('NOT_FOUND', 'Jang topilmadi');
        }
        return self::battleOut($b, $pid, true);
    }

    public static function battleOut(array $b, int $pid, bool $full): array
    {
        $isAtt = (int) $b['attacker_id'] === $pid;
        $won = ($b['result'] === 'attacker_win' && $isAtt) || ($b['result'] === 'defender_win' && !$isAtt);
        $out = [
            'id' => (int) $b['id'], 'kind' => $b['kind'], 'side' => $isAtt ? 'attacker' : 'defender',
            'opponent' => $isAtt ? $b['def_name'] : $b['att_name'],
            'opponent_level' => (int) ($isAtt ? $b['def_level'] : $b['att_level']),
            'result' => $b['result'], 'outcome' => $b['result'] === 'draw' ? 'draw' : ($won ? 'win' : 'loss'),
            'ratio' => (float) $b['ratio'], 'ep_attacker' => (int) $b['ep_attacker'], 'ep_defender' => (int) $b['ep_defender'],
            'loot' => json_decode((string) $b['loot'], true) ?: [], 'trap' => (int) $b['trap'] === 1,
            'created_at' => Game::iso($b['created_at']),
            'att_losses' => json_decode($b['att_losses'], true), 'def_losses' => json_decode($b['def_losses'], true),
        ];
        if ($full) {
            $out['log'] = json_decode($b['log'], true);
            $out['attacker'] = $b['att_name'];
            $out['defender'] = $b['def_name'];
        }
        return $out;
    }

    public static function marchOut(array $m): array
    {
        return [
            'id' => (int) $m['id'], 'kind' => $m['kind'], 'state' => $m['state'],
            'target_id' => $m['target_player'] === null ? null : (int) $m['target_player'],
            'target_name' => $m['target_name'] ?? null, 'payload' => json_decode($m['payload'], true),
            'departs_at' => Game::iso($m['departs_at']), 'arrives_at' => Game::iso($m['arrives_at']),
            'returns_at' => Game::iso($m['returns_at']),
            'loot' => ($l = json_decode((string) $m['loot'], true)) ? ($l['res'] ?? []) : null,
        ];
    }
}
