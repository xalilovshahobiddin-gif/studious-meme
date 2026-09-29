<?php
declare(strict_types=1);

namespace BlueWolf;

/**
 * Tanishtiruv — 20 qadam, 1→5 daraja (GDD bo'lim 15). Har qadam shartini server tekshiradi.
 * Qadam tugagach oʻyinchi keyingi qadam darajasiga koʻtariladi (15 daqiqada 5-daraja).
 */
final class Tutorial
{
    public static function step(int $pid, int $step, int $now): array
    {
        $steps = Config::data('tutorial');
        return Db::tx(function () use ($pid, $step, $now, $steps) {
            $ctx = Game::lock($pid);
            $cur = (int) $ctx['p']['tutorial_step'];
            if ($step !== $cur + 1 || !isset($steps[$step])) {
                throw new ApiError('TUTORIAL_ORDER', 'Qadam tartibi notoʻgʻri', ['current' => $cur]);
            }
            $def = $steps[$step];
            $extra = self::check($ctx, $def['check'] ?? null, $now);
            self::grant($ctx, $def['reward'], $now);
            $ctx['p']['tutorial_step'] = $step;
            if (isset($steps[$step + 1])) {
                Game::setLevelAtLeast($ctx, $steps[$step + 1]['level'], $now);
            } else {
                Game::setLevelAtLeast($ctx, $def['level'], $now);
                Analytics::log($pid, 'tutorial_done', ['seconds' => $now - Db::ts($ctx['p']['created_at'])]);
            }
            Game::save($ctx);
            Analytics::log($pid, 'tutorial_step', ['step' => $step]);
            return ['step' => $step, 'reward' => $def['reward']] + $extra;
        });
    }

    public static function skip(int $pid, int $now): array
    {
        $steps = Config::data('tutorial');
        $last = max(array_keys($steps));
        return Db::tx(function () use ($pid, $now, $steps, $last) {
            $ctx = Game::lock($pid);
            if ((int) $ctx['p']['tutorial_step'] < Config::int('tutorial_skip_step')) {
                throw new ApiError('TUTORIAL_ORDER', 'Oʻtkazib yuborish 12-qadamdan keyin');
            }
            if ((int) $ctx['p']['tutorial_step'] < $last) {
                self::grant($ctx, $steps[$last]['reward'], $now);
                $ctx['p']['tutorial_step'] = $last;
                Game::setLevelAtLeast($ctx, $steps[$last]['level'], $now);
                Game::save($ctx);
                Analytics::log($pid, 'tutorial_skip', []);
            }
            return ['step' => $last];
        });
    }

    private static function check(array &$ctx, ?array $check, int $now): array
    {
        if ($check === null) {
            return [];
        }
        $pid = (int) $ctx['p']['id'];
        if (isset($check['hunts']) && (int) $ctx['p']['stat_hunts'] < $check['hunts']) {
            throw new ApiError('TUTORIAL_CHECK', 'Avval ov qiling', ['need_hunts' => $check['hunts']]);
        }
        if (isset($check['building'])) {
            [$type, $lvl] = $check['building'];
            if ($ctx['b'][$type] < $lvl) {
                throw new ApiError('TUTORIAL_CHECK', 'Avval binoni quring', ['building' => $type, 'level' => $lvl]);
            }
        }
        if (isset($check['army'])) {
            [$role, $n] = $check['army'];
            $queued = (int) Db::val("SELECT COALESCE(SUM(qty),0) FROM queues WHERE player_id = ? AND role = ?
                                      AND kind = 'train' AND state = 'running'", [$pid, $role]);
            if (Game::roleCount($ctx, $role) + $queued < $n) {
                throw new ApiError('TUTORIAL_CHECK', 'Avval askar tayyorlang', ['role' => $role]);
            }
        }
        if (!empty($check['tutorial_battle'])) {
            return ['battle' => self::battle($ctx, $now)];
        }
        if (!empty($check['tutorial_scout'])) {
            $bot = Game::lock(self::botId());
            $rid = Pvp::writeReport($ctx, $bot, 'exact', 99.0, $now);
            return ['report' => Pvp::report($pid, (int) $bot['p']['id'], $now) + ['id' => $rid]];
        }
        return [];
    }

    private static function botId(): int
    {
        $id = Bots::tutorialBot();
        if ($id === null) {
            Bots::ensurePool(time());
            $id = Bots::tutorialBot();
        }
        return $id;
    }

    /** 16-qadam: bot bilan mashq jangi — birinchi tajriba gʻalaba boʻlishi shart, yoʻqotish yoʻq. */
    private static function battle(array $ctx, int $now): array
    {
        $bot = Game::lock(self::botId());
        $groups = array_values(array_filter(Game::homeGroups($ctx), static fn($g) => $g['role'] !== 'scout'));
        if (!$groups) {
            $groups = [['role' => 'hunter', 'tier' => 1, 'qty' => 1]];
        }
        $b = Battle::resolve(['groups' => $groups, 'level' => $ctx['p']['level']],
            ['groups' => Game::homeGroups($bot), 'level' => 1, 'alpha_cp' => 0.0], false);
        $b['result'] = 'attacker_win';
        $last = count($b['log']) - 1;
        $b['log'][$last]['event'] = 'attacker_win';
        $id = Db::insert('battles', [
            'kind' => 'tutorial', 'attacker_id' => $ctx['p']['id'], 'defender_id' => $bot['p']['id'],
            'ep_attacker' => $b['ep_attacker'], 'ep_defender' => $b['ep_defender'], 'ratio' => min(99999, $b['ratio']),
            'rounds' => Config::int('battle_rounds'), 'result' => 'attacker_win',
            'att_losses' => json_encode(['dead' => [], 'injured' => []]), 'def_losses' => json_encode($b['def_losses']),
            'loot' => json_encode(['stone' => 50]), 'log' => json_encode($b['log']), 'created_at' => Db::dt($now),
        ]);
        return Pvp::battle((int) $ctx['p']['id'], $id);
    }

    private static function grant(array &$ctx, array $reward, int $now): void
    {
        foreach ($reward as $k => $v) {
            if ($k === 'free_speedups') {
                $ctx['p']['free_speedups'] += $v;
            } elseif ($k === 'army') {
                Game::unit($ctx, $v[0], 1)['alive'] += $v[1];
            } else {
                Game::give($ctx, [$k => $v]);
            }
        }
    }
}
