<?php

namespace App\Services;

use App\Models\GameConfig;
use App\Models\Player;
use App\Models\PlayerResource;
use App\Models\Queue;
use Carbon\CarbonImmutable;

/**
 * Resurs hisobi — texnik spec 4.1 (timestamp accrual, tick yoʻq).
 * Formula klientdagi public/js/game.js → advance() bilan bir xil; ikkala tomon bir xil
 * test holatlari bilan tekshiriladi (tests/fixtures/economy_cases.json).
 */
class EconomyService
{
    public const BUILD = ['stone', 'wood', 'hide', 'bone'];

    /**
     * Sof hisob: $e holatini $t1 (ms) gacha olib boradi.
     *
     * @param  array<string, mixed>  $cfg  game_config qiymatlari
     * @param  array<string, mixed>  $e  {res, buf, alloc, level, cave, workshop, army, last_tick, last_seen}
     * @return array<string, mixed>
     */
    public static function advance(array $cfg, array $e, float $t1): array
    {
        $t = (float) $e['last_tick'];
        if (! ($t1 > $t)) {
            return $e;
        }
        $level = (int) $e['level'];
        $army = (int) ($e['army'] ?? 0);
        $cave = (int) $e['cave'];
        $offAt = (float) $e['last_seen'] + $cfg['offline_after_min'] * 60000;
        $meatH = self::need($cfg, $level) * $army / 24;
        $waterNetH = self::waterPerHour($cfg, $cave) - self::waterNeed($cfg, $level) * $army / 24;
        $moonOn = $level >= $cfg['moonlight_need_level'];
        $moonNetH = $moonOn ? ($cave > 0 ? $cfg['moonlight_passive_base'] * $army : 0) - $cfg['moonlight_need'] * $army / 24 : 0;
        $prodH = self::workshopPerHour($cfg, (int) $e['workshop']);

        for ($guard = 0; $t < $t1 && $guard < 8; $guard++) {
            $offline = $t >= $offAt;
            $end = $offline ? $t1 : min($t1, $offAt);
            $starve = false;
            if ($e['res']['meat'] > 0 && $meatH > 0) {
                $tz = $t + $e['res']['meat'] / $meatH * 3600000;
                if ($tz <= $end) {
                    $end = $tz;
                    $starve = true;
                }
            }
            $h = ($end - $t) / 3600000;
            $hungry = $army > 0 && $e['res']['meat'] <= 0;
            $rate = $prodH * ($offline ? $cfg['offline_prod_rate'] : 1) * ($hungry ? 1 - $cfg['hunger_prod_penalty'] : 1);
            foreach (self::BUILD as $k) {
                $share = $e['alloc'][$k] ?? 0;
                $e['buf'][$k] = self::grow($e['buf'][$k] ?? 0, $rate * $share / 100 * $h, self::bufferCap($cfg, (int) $e['workshop'], $share, $offline));
            }
            $e['res']['meat'] = $starve ? 0.0 : max(0.0, $e['res']['meat'] - $meatH * $h);
            $cap = self::caveCap($cfg, $cave) * ($offline ? $cfg['offline_store_mult'] : 1);
            $e['res']['water'] = self::grow($e['res']['water'] ?? 0, $waterNetH * $h, $cap);
            if ($moonOn) {
                $e['res']['moonlight'] = self::grow($e['res']['moonlight'] ?? 0, $moonNetH * $h, $cap);
            }
            $t = $end;
        }
        $e['last_tick'] = $t1;

        return $e;
    }

    /**
     * Oʻyinchi resurslarini hozirgi vaqtgacha hisoblaydi va saqlaydi (qator qulflangan holda).
     * Muddati yetgan qurilish navbatlari shu yerda “dangasa” yopiladi: hisob har birining tugash
     * paytigacha eski daraja bilan, keyin yangi daraja bilan davom etadi (texnik spec 4.1–4.2).
     *
     * @return array{away: array{seconds: int, gained: array<string, int>}|null, finished: list<array<string, mixed>>}
     */
    public function sync(Player $player, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();
        $res = PlayerResource::query()->whereKey($player->id)->lockForUpdate()->firstOrFail();

        $before = $this->load($player, $res);
        $after = $before;
        $finished = [];
        $due = $player->queues()->where('kind', 'build')->where('state', 'running')
            ->where('ends_at', '<=', $now->format('Y-m-d H:i:s.v'))->orderBy('ends_at')->get();
        foreach ($due as $queue) {
            // Ikki marta bajarilmasligi uchun shartli UPDATE
            if (Queue::query()->whereKey($queue->id)->where('state', 'running')->update(['state' => 'done']) !== 1) {
                continue;
            }
            $after = self::advance($cfg, $after, max($after['last_tick'], (float) $queue->ends_at->getTimestampMs()));
            $player->buildings()->where('type', $queue->building_type)->update(['level' => $queue->target_level]);
            if ($queue->building_type === 'food_cave') {
                $after['cave'] = $queue->target_level;
            } elseif ($queue->building_type === 'workshop') {
                $after['workshop'] = $queue->target_level;
            }
            $finished[] = ['type' => $queue->building_type, 'level' => $queue->target_level];
        }
        $after = self::advance($cfg, $after, self::ms($now));
        $this->store($res, $after);

        $player->forceFill(['last_seen_at' => $now])->save();
        $player->setRelation('resources', $res);

        $away = (self::ms($now) - $before['last_seen']) / 1000;
        if ($away < $cfg['offline_after_min'] * 60) {
            return ['away' => null, 'finished' => $finished];
        }
        $gained = [];
        foreach (['water', 'moonlight', 'meat'] as $k) {
            $gained[$k] = (int) floor($after['res'][$k]) - (int) floor($before['res'][$k]);
        }
        foreach (self::BUILD as $k) {
            $gained[$k] = (int) floor($after['buf'][$k]) - (int) floor($before['buf'][$k]);
        }

        return ['away' => ['seconds' => (int) $away, 'gained' => array_filter($gained)], 'finished' => $finished];
    }

    /**
     * Ustaxona buferini omborga oʻtkazadi (POST /buildings/collect). Avval sync() chaqirilgan boʻlishi kerak.
     *
     * @return array<string, int>
     */
    public function collect(PlayerResource $res): array
    {
        $got = [];
        foreach (self::BUILD as $k) {
            $got[$k] = (int) floor((float) $res->{'buf_'.$k});
            $res->{$k} = (float) $res->{$k} + $got[$k];
            $res->{'buf_'.$k} = (float) $res->{'buf_'.$k} - $got[$k];
        }
        $res->save();

        return $got;
    }

    /**
     * Klient oʻz hisobini davom ettirishi uchun aniq (kasrli) holat.
     *
     * @return array<string, mixed>
     */
    public function clientState(Player $player): array
    {
        $e = $this->load($player, $player->resources);
        $round = fn (array $a) => array_map(fn ($v) => round((float) $v, 4), $a);

        return [
            'res' => $round($e['res']),
            'buf' => $round($e['buf']),
            'alloc' => $e['alloc'],
            'level' => $e['level'],
            'cave' => $e['cave'],
            'workshop' => $e['workshop'],
            'army' => $e['army'],
            'last_tick' => $e['last_tick'],
            'last_seen' => $e['last_seen'],
        ];
    }

    /** @return array<string, mixed> */
    private function load(Player $player, PlayerResource $res): array
    {
        $levels = $player->buildings()->pluck('level', 'type');
        $e = [
            'res' => [],
            'buf' => [],
            'alloc' => [],
            'level' => $player->level,
            'cave' => (int) ($levels['food_cave'] ?? 0),
            'workshop' => (int) ($levels['workshop'] ?? 0),
            'army' => $this->armySize($player),
            'last_tick' => self::ms($res->last_tick_at),
            'last_seen' => self::ms($player->last_seen_at),
        ];
        foreach (['meat', 'water', 'herb', 'moonlight', 'stone', 'wood', 'hide', 'bone'] as $k) {
            $e['res'][$k] = (float) $res->{$k};
        }
        foreach (self::BUILD as $k) {
            $e['buf'][$k] = (float) $res->{'buf_'.$k};
            $e['alloc'][$k] = (int) $res->{'alloc_'.$k};
        }

        return $e;
    }

    /** @param  array<string, mixed>  $e */
    private function store(PlayerResource $res, array $e): void
    {
        foreach (['meat', 'water', 'moonlight'] as $k) {
            $res->{$k} = round($e['res'][$k], 4);
        }
        foreach (self::BUILD as $k) {
            $res->{'buf_'.$k} = round($e['buf'][$k], 4);
        }
        $res->last_tick_at = CarbonImmutable::createFromTimestampMs((int) $e['last_tick']);
        $res->save();
    }

    /** Qoʻshin hajmi — askarlar jadvali v0.3 da qoʻshiladi, hozircha 0 (sarf yoʻq). */
    private function armySize(Player $player): int
    {
        return 0;
    }

    private static function ms(mixed $time): float
    {
        return (float) CarbonImmutable::parse($time ?? 'now')->getTimestampMs();
    }

    private static function grow(float $v, float $d, float $cap): float
    {
        if ($d >= 0) {
            return $v >= $cap ? $v : min($cap, $v + $d);
        }

        return max(0.0, $v + $d);
    }

    /** @param  array<string, mixed>  $cfg */
    public static function bufferCap(array $cfg, int $wsLevel, float $share, bool $offline): float
    {
        return self::workshopPerHour($cfg, $wsLevel) * $cfg['workshop_buffer_h'] * $share / 100 * ($offline ? $cfg['offline_store_mult'] : 1);
    }

    /** @param  array<string, mixed>  $cfg */
    private static function need(array $cfg, int $level): float
    {
        return $cfg['need_base'] + $cfg['need_growth'] * ($level - 1);
    }

    /** @param  array<string, mixed>  $cfg */
    private static function waterNeed(array $cfg, int $level): float
    {
        return $cfg['water_need_base'] + $cfg['water_need_growth'] * ($level - 1);
    }

    /** @param  array<string, mixed>  $cfg */
    private static function waterPerHour(array $cfg, int $caveLevel): float
    {
        return $caveLevel > 0 ? $cfg['water_passive_base'] * $cfg['water_passive_growth'] ** ($caveLevel - 1) : 0.0;
    }

    /** @param  array<string, mixed>  $cfg */
    private static function caveCap(array $cfg, int $caveLevel): float
    {
        return $cfg['store_base'] * $cfg['store_growth'] ** (max(1, $caveLevel) - 1);
    }

    /** @param  array<string, mixed>  $cfg */
    private static function workshopPerHour(array $cfg, int $wsLevel): float
    {
        return $wsLevel > 0 ? $cfg['prod_base'] * $cfg['prod_growth'] ** ($wsLevel - 1) : 0.0;
    }
}
