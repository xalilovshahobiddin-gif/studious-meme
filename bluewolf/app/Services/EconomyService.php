<?php

namespace App\Services;

use App\Models\GameConfig;
use App\Models\March;
use App\Models\Player;
use App\Models\PlayerResource;
use App\Models\Queue;
use App\Support\Formula;
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
        $unit = Formula::unitScale($cfg, $level);
        $moonNetH = $moonOn ? ($cave > 0 ? $cfg['moonlight_passive_base'] / $unit * $army : 0) - $cfg['moonlight_need'] / $unit * $army / 24 : 0;
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

    public function __construct(
        private readonly ArmyService $army,
        private readonly HuntService $hunts,
        private readonly ProgressService $progress,
    ) {}

    /**
     * Oʻyinchi resurslarini hozirgi vaqtgacha hisoblaydi va saqlaydi (qator qulflangan holda).
     * Muddati yetgan voqealar — qurilish, mashq, ovdan qaytish — shu yerda “dangasa” yopiladi,
     * vaqt tartibida: hisob har birining paytigacha eski holat bilan, keyin yangisi bilan davom etadi
     * (texnik spec 4.1–4.2). Ikki marta bajarilmasligi uchun shartli UPDATE … WHERE state = 'running'.
     *
     * @return array{away: array{seconds: int, gained: array<string, int>}|null, finished: list<array<string, mixed>>}
     */
    public function sync(Player $player, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();
        $res = PlayerResource::query()->whereKey($player->id)->lockForUpdate()->firstOrFail();
        $nowMs = self::ms($now);

        $before = $this->load($player, $res);
        $after = $before;
        $finished = [];

        // Voqea yangi voqea tugʻdirishi mumkin (ovdan yarador → tuzalish navbati) — boʻsh qolguncha takrorlanadi
        while ($events = $this->dueEvents($player, $now)) {
            foreach ($events as [$t, $item]) {
                $closed = $item instanceof Queue
                    ? Queue::query()->whereKey($item->id)->where('state', 'running')->update(['state' => 'done'])
                    : March::query()->whereKey($item->id)->where('state', 'gathering')->update(['state' => 'done']);
                if ($closed !== 1) {
                    continue;
                }
                $after = self::advance($cfg, $after, max($after['last_tick'], $t));
                $xp = 0.0;
                if ($item instanceof March) {
                    $cas = $this->hunts->finish($item);
                    $offline = $t >= $before['last_seen'] + $cfg['offline_after_min'] * 60000;
                    $cap = self::caveCap($cfg, $after['cave']) * ($offline ? $cfg['offline_store_mult'] : 1);
                    $loot = $item->loot;
                    $lost = self::addFood($after, 'meat', $loot['meat'], $cap) + self::addFood($after, 'herb', $loot['herb'], $cap);
                    $after['army'] -= $cas['dead'];
                    $xp = $loot['xp'];
                    $finished[] = ['kind' => 'hunt', 'meat' => $loot['meat'], 'herb' => $loot['herb'], 'xp' => $xp, 'lost' => round($lost, 2),
                        'prey' => $loot['prey'] ?? null, 'band' => $loot['band'] ?? 0, 'injured' => $cas['injured'], 'dead' => $cas['dead']];
                } elseif ($item->kind === 'build') {
                    $player->buildings()->where('type', $item->building_type)->update(['level' => $item->target_level]);
                    if ($item->building_type === 'food_cave') {
                        $after['cave'] = $item->target_level;
                    } elseif ($item->building_type === 'workshop') {
                        $after['workshop'] = $item->target_level;
                    }
                    $xp = array_sum(array_intersect_key($item->cost, array_flip(self::BUILD))) * $cfg['xp_build_coef'];
                    $finished[] = ['kind' => 'build', 'type' => $item->building_type, 'level' => $item->target_level];
                } elseif ($item->kind === 'train') {
                    $this->army->add($player, $item->role, $item->tier, $item->qty);
                    $after['army'] += $item->qty;
                    $xp = array_sum(array_intersect_key($item->cost, array_flip(self::BUILD))) * $cfg['xp_build_coef'];
                    $finished[] = ['kind' => 'train', 'role' => $item->role, 'tier' => $item->tier, 'qty' => $item->qty];
                } elseif ($item->kind === 'heal') {
                    $this->army->heal($player, $item->role, $item->tier, $item->qty);
                    $finished[] = ['kind' => 'heal', 'role' => $item->role, 'tier' => $item->tier, 'qty' => $item->qty];
                }
                foreach ($this->progress->addXp($player, $xp) as $level) {
                    $after['level'] = $level;
                    $finished[] = ['kind' => 'level', 'level' => $level];
                }
            }
        }
        $after = self::advance($cfg, $after, $nowMs);
        $this->store($res, $after);

        $player->forceFill(['last_seen_at' => $now])->save();
        $player->setRelation('resources', $res);

        $away = ($nowMs - $before['last_seen']) / 1000;
        if ($away < $cfg['offline_after_min'] * 60) {
            return ['away' => null, 'finished' => $finished];
        }
        $gained = [];
        foreach (['water', 'moonlight', 'meat', 'herb'] as $k) {
            $gained[$k] = (int) floor($after['res'][$k]) - (int) floor($before['res'][$k]);
        }
        foreach (self::BUILD as $k) {
            $gained[$k] = (int) floor($after['buf'][$k]) - (int) floor($before['buf'][$k]);
        }

        return ['away' => ['seconds' => (int) $away, 'gained' => array_filter($gained, fn ($v) => $v > 0)], 'finished' => $finished];
    }

    /**
     * Muddati yetgan navbatlar va ovdan qaytishlar, vaqt tartibida.
     *
     * @return list<array{0: float, 1: Queue|March}>
     */
    private function dueEvents(Player $player, CarbonImmutable $now): array
    {
        $events = [];
        $cut = $now->format('Y-m-d H:i:s.v');
        foreach ($player->queues()->where('state', 'running')->where('ends_at', '<=', $cut)->get() as $queue) {
            $events[] = [(float) $queue->ends_at->getTimestampMs(), $queue];
        }
        foreach ($player->marches()->where('state', 'gathering')->where('returns_at', '<=', $cut)->get() as $march) {
            $events[] = [(float) $march->returns_at->getTimestampMs(), $march];
        }
        usort($events, fn ($a, $b) => $a[0] <=> $b[0]);

        return $events;
    }

    /**
     * Oziq resursini Oziq gʻori sigʻimigacha qoʻshadi; ortigʻi saqlanmaydi (chiriydi).
     *
     * @param  array<string, mixed>  $e
     * @return float sigʻimga sigʻmagan miqdor
     */
    public static function addFood(array &$e, string $key, float $amount, float $cap): float
    {
        $room = max(0.0, $cap - $e['res'][$key]);
        $put = min($room, $amount);
        $e['res'][$key] += $put;

        return $amount - $put;
    }

    /**
     * Darhol olingan oziq (yolgʻiz ov): onlayn sigʻim bilan. sync() dan keyin chaqiriladi.
     *
     * @return float sigʻmagan miqdor
     */
    public function addFoodNow(Player $player, string $key, float $amount): float
    {
        $res = $player->resources;
        $cave = (int) ($player->buildings()->where('type', 'food_cave')->value('level') ?? 0);
        $e = ['res' => [$key => (float) $res->{$key}]];
        $lost = self::addFood($e, $key, $amount, self::caveCap(GameConfig::allValues(), $cave));
        $res->{$key} = round($e['res'][$key], 4);
        $res->save();

        return $lost;
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
            'army' => $this->army->total($player),
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
        foreach (['meat', 'water', 'herb', 'moonlight'] as $k) {
            $res->{$k} = round($e['res'][$k], 4);
        }
        foreach (self::BUILD as $k) {
            $res->{'buf_'.$k} = round($e['buf'][$k], 4);
        }
        $res->last_tick_at = CarbonImmutable::createFromTimestampMs((int) $e['last_tick']);
        $res->save();
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
        return Formula::need($cfg, $level);
    }

    /** @param  array<string, mixed>  $cfg */
    private static function waterNeed(array $cfg, int $level): float
    {
        return Formula::waterNeed($cfg, $level);
    }

    /** @param  array<string, mixed>  $cfg */
    private static function waterPerHour(array $cfg, int $caveLevel): float
    {
        return $caveLevel > 0 ? $cfg['water_passive_base'] * $cfg['water_passive_growth'] ** ($caveLevel - 1) : 0.0;
    }

    /** @param  array<string, mixed>  $cfg */
    public static function caveCap(array $cfg, int $caveLevel): float
    {
        return $cfg['store_base'] * $cfg['store_growth'] ** (max(1, $caveLevel) - 1);
    }

    /** @param  array<string, mixed>  $cfg */
    private static function workshopPerHour(array $cfg, int $wsLevel): float
    {
        return $wsLevel > 0 ? $cfg['prod_base'] * $cfg['prod_growth'] ** ($wsLevel - 1) : 0.0;
    }
}
