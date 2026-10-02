<?php
declare(strict_types=1);

namespace BlueWolf;

/** Kundalik vazifalar. Mukofot vaqt tejaydi, kuch bermaydi (GDD bo'lim 14). */
final class Quests
{
    private static function nextMidnight(int $now): int
    {
        return (int) (floor($now / 86400) + 1) * 86400;
    }

    public static function ensure(int $pid, int $now): void
    {
        foreach (Config::data('quests')['daily'] as $key => $q) {
            $row = Db::one("SELECT id, resets_at FROM quests WHERE player_id = ? AND quest_key = ? AND kind = 'daily'", [$pid, $key]);
            if (!$row) {
                Db::insert('quests', ['player_id' => $pid, 'quest_key' => $key, 'kind' => 'daily',
                    'target' => $q['target'], 'resets_at' => Db::dt(self::nextMidnight($now))]);
            } elseif (Db::ts($row['resets_at']) <= $now) {
                Db::update('quests', ['progress' => 0, 'claimed_at' => null, 'target' => $q['target'],
                    'resets_at' => Db::dt(self::nextMidnight($now))], 'id = ?', [$row['id']]);
            }
        }
    }

    public static function bump(int $pid, string $key, int $n, int $now): void
    {
        if (!isset(Config::data('quests')['daily'][$key])) {
            return;
        }
        self::ensure($pid, $now);
        Db::exec("UPDATE quests SET progress = LEAST(target, progress + ?)
                  WHERE player_id = ? AND quest_key = ? AND kind = 'daily' AND claimed_at IS NULL", [$n, $pid, $key]);
    }

    public static function reward(array $ctx, string $key): array
    {
        $def = Config::data('quests')['daily'][$key];
        $budget = F::dailyProduction($ctx['b']['workshop']) * Config::get('quest_daily_cap') / Config::get('quest_daily_count');
        $out = [];
        foreach ($def['reward'] as $res => $share) {
            $out[$res] = (int) round($budget * $share);
        }
        return $out;
    }

    public static function list(int $pid, int $now): array
    {
        self::ensure($pid, $now);
        $ctx = Game::lockless($pid);
        $defs = Config::data('quests')['daily'];
        $out = [];
        foreach (Db::all("SELECT * FROM quests WHERE player_id = ? AND kind = 'daily' ORDER BY id", [$pid]) as $q) {
            $def = $defs[$q['quest_key']] ?? null;
            if ($def === null) {
                continue;
            }
            $out[] = [
                'id' => (int) $q['id'], 'key' => $q['quest_key'], 'kind' => 'daily',
                'progress' => (int) $q['progress'], 'target' => (int) $q['target'],
                'claimed' => $q['claimed_at'] !== null, 'locked' => $ctx['p']['level'] < ($def['level'] ?? 1),
                'reward' => self::reward($ctx, $q['quest_key']), 'resets_at' => Game::iso($q['resets_at']),
            ];
        }
        return ['daily' => $out, 'weekly' => [], 'milestone' => []];
    }

    public static function claim(int $pid, int $qid, int $now): array
    {
        return Db::tx(function () use ($pid, $qid, $now) {
            $ctx = Game::lock($pid);
            $q = Db::one('SELECT * FROM quests WHERE id = ? AND player_id = ? FOR UPDATE', [$qid, $pid]);
            if (!$q) {
                throw new ApiError('NOT_FOUND', 'Vazifa topilmadi');
            }
            if ($q['claimed_at'] !== null || (int) $q['progress'] < (int) $q['target'] || Db::ts($q['resets_at']) <= $now) {
                throw new ApiError('BAD_REQUEST', 'Vazifa hali bajarilmagan');
            }
            $reward = self::reward($ctx, $q['quest_key']);
            Game::give($ctx, $reward);
            Game::addXp($ctx, array_sum($reward) * Config::get('xp_quest_share'), $now);
            Db::exec('UPDATE quests SET claimed_at = ? WHERE id = ?', [Db::dt($now), $qid]);
            Game::save($ctx);
            return ['reward' => $reward];
        });
    }
}
