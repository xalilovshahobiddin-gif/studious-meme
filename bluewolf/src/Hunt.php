<?php
declare(strict_types=1);

namespace BlueWolf;

/**
 * Ov — asosiy sikl (GDD bo'lim 0, 4). Alfa va (4-darajadan) ovchilar oʻljaga chiqadi.
 * Toʻda talab qiladigan oʻlja (sugʻur, jayron...) uchun yetarli ovchi yuborish shart.
 */
final class Hunt
{
    public static function preyList(array $ctx): array
    {
        $out = [];
        $lvl = $ctx['p']['level'];
        foreach (Config::data('prey') as $key => $p) {
            if ($p['level'] > Config::int('max_level')) {
                continue;
            }
            $y = F::huntYield($p, 0);
            $out[] = ['key' => $key, 'kg' => $p['kg'], 'meat' => $y['meat'], 'bone' => $y['bone'], 'level' => $p['level'], 'pack' => $p['pack'],
                'unlocked' => $lvl >= $p['level'], 'seconds' => self::seconds($ctx, $p['kg']),
                'xp' => (int) round($p['kg'] * Config::get('xp_hunt_coef'))];
        }
        return $out;
    }

    private static function seconds(array $ctx, float $kg): int
    {
        if ((int) $ctx['p']['tutorial_step'] < Config::int('tutorial_steps')) {
            return Config::int('tutorial_hunt_sec');
        }
        return F::huntSeconds($kg);
    }

    public static function start(int $pid, string $preyKey, mixed $payload, int $now): array
    {
        $prey = Config::data('prey')[$preyKey] ?? null;
        if ($prey === null) {
            throw new ApiError('BAD_REQUEST', 'Nomaʼlum oʻlja');
        }
        return Db::tx(function () use ($pid, $preyKey, $prey, $payload, $now) {
            $ctx = Game::lock($pid);
            if ($ctx['p']['level'] < $prey['level']) {
                throw new ApiError('LEVEL_TOO_LOW', 'Bu oʻlja hali ochilmagan', ['need_level' => $prey['level']]);
            }
            if ((int) Db::val("SELECT COUNT(*) FROM hunts WHERE player_id = ? AND state = 'running'", [$pid]) > 0) {
                throw new ApiError('QUEUE_BUSY', 'Alfa hozir ovda');
            }
            $groups = is_array($payload) && $payload ? Army::normalizePayload($ctx, $payload, ['hunter']) : [];
            $pack = 1;
            $bonus = 0;
            foreach ($groups as $g) {
                $pack += $g['qty'];
                $bonus += $g['qty'] * $g['tier'];
            }
            if ($pack < $prey['pack']) {
                throw new ApiError('NOT_ENOUGH_ARMY', 'Bu oʻljani yolgʻiz ovlab boʻlmaydi — toʻda kerak',
                    ['need_pack' => $prey['pack']]);
            }
            // Kerakli toʻdadan ortiqcha ovchilar koʻproq goʻsht olib keladi
            $extra = max(0, $bonus - ($prey['pack'] - 1));
            $yield = F::huntYield($prey, $extra);
            $meat = $yield['meat'];
            $xp = (int) round($prey['kg'] * Config::get('xp_hunt_coef'));
            $sec = self::seconds($ctx, $prey['kg']);
            Army::move($ctx, $groups, 'alive', 'on_march');
            $id = Db::insert('hunts', [
                'player_id' => $pid, 'prey_key' => $preyKey, 'payload' => json_encode($groups),
                'meat' => $meat, 'bone' => $yield['bone'], 'xp' => max(1, $xp), 'started_at' => Db::dt($now), 'ends_at' => Db::dt($now + $sec),
            ]);
            Game::save($ctx);
            return ['hunt_id' => $id, 'seconds' => $sec, 'ends_at' => Game::iso(Db::dt($now + $sec)), 'meat' => $meat, 'bone' => $yield['bone']];
        });
    }

    public static function complete(array &$ctx, array $h, int $at): void
    {
        Db::exec("UPDATE hunts SET state = 'done' WHERE id = ?", [$h['id']]);
        Army::move($ctx, json_decode($h['payload'], true) ?: [], 'on_march', 'alive');
        $cap = F::foodCap($ctx['b']['food_cave']);
        $meat = max(0.0, min((float) $h['meat'], $cap - $ctx['r']['meat']));
        $ctx['r']['meat'] += $meat;
        $ctx['r']['bone'] += (float) $h['bone'];
        Economy::fed($ctx);
        Game::addXp($ctx, (float) $h['xp'], $at);
        $ctx['p']['stat_hunts']++;
        Quests::bump((int) $ctx['p']['id'], 'hunt', 1, $at);
        if ((int) $ctx['p']['stat_hunts'] === 1) {
            Analytics::log((int) $ctx['p']['id'], 'first_hunt', []);
        }
    }
}
