<?php

namespace App\Services;

use App\Models\Army;
use App\Models\GameConfig;
use App\Models\March;
use App\Models\Player;
use App\Support\Formula;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Ov (GDD bo'lim 4): yolgʻiz ov (1–3 daraja) va ov xaritasi — har oʻyinchiga oʻz 9 ta kartasi,
 * har hunt_board_refresh_h soatda yangilanadi. Uzoq kartalarda askar yarador yoki halok boʻlishi mumkin.
 */
class HuntService
{
    public function __construct(private readonly ArmyService $army) {}

    /**
     * Joriy ov xaritasi: kartalar + qaysi biri ovlangan/ovda.
     *
     * @return array{window: int, refresh_at: int, cards: list<array<string, mixed>>}
     */
    public function board(Player $player, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();
        $window = Formula::huntWindow($cfg, (float) $now->getTimestampMs());
        $states = $player->marches()->where('kind', 'hunt')->where('board_window', $window)->pluck('state', 'board_slot');
        $cards = array_map(function (array $card) use ($states) {
            $state = $states[$card['slot']] ?? null;
            $card['status'] = $state === null ? 'open' : ($state === 'done' ? 'done' : 'hunting');

            return $card;
        }, Formula::huntBoard($cfg, $player->id, $player->level, $window));

        return [
            'window' => $window,
            'refresh_at' => (int) (($window + 1) * $cfg['hunt_board_refresh_h'] * 3600000),
            'cards' => $cards,
        ];
    }

    /**
     * Yolgʻiz ov: alfa oʻzi, darhol natija, keyin solo_hunt_cooldown_min kutish.
     *
     * @return array{meat: float, herb: float, xp: float}
     */
    public function solo(Player $player, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();
        if ($player->level > $cfg['solo_hunt_max_level']) {
            throw new GameException('LEVEL_TOO_LOW', 'Yolgʻiz ov faqat 1–'.(int) $cfg['solo_hunt_max_level'].'-darajada', 400);
        }
        $ready = $player->solo_hunt_at?->addMinutes((int) $cfg['solo_hunt_cooldown_min']);
        if ($ready !== null && $ready->greaterThan($now)) {
            throw new GameException('COOLDOWN', 'Alfa dam olmoqda', 400, ['ready_at' => $ready->getTimestampMs()]);
        }
        $kg = Formula::PREY[$player->level][1];
        $player->solo_hunt_at = $now;
        $player->save();

        return ['meat' => $kg, 'herb' => round($kg * $cfg['hunt_herb_share'], 2), 'xp' => round($kg * $cfg['xp_hunt_coef'], 2)];
    }

    /**
     * Kartadagi ovga chiqish. Natija (goʻsht, yarador/halok) shu yerda aniqlanadi va qaytishda qoʻllanadi.
     *
     * @param  array<string, array<int|string, int>>  $payload  rol → {tier: soni}
     */
    public function start(Player $player, int $slot, array $payload, ?CarbonImmutable $now = null): March
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();
        if ($player->level < $cfg['hunter_unlock_level']) {
            throw new GameException('LEVEL_TOO_LOW', 'Toʻda ovi '.(int) $cfg['hunter_unlock_level'].'-darajadan', 400);
        }
        $board = $this->board($player, $now);
        $card = $board['cards'][$slot] ?? null;
        if ($card === null) {
            throw new GameException('VALIDATION', 'Bunday ov kartasi yoʻq', 422);
        }
        if ($card['status'] !== 'open') {
            throw new GameException('QUEUE_BUSY', 'Bu karta allaqachon ovlangan', 409);
        }

        $clean = [];
        $hunters = 0;
        foreach ($payload as $role => $tiers) {
            if (! in_array($role, Army::ROLES, true) || ! is_array($tiers)) {
                throw new GameException('VALIDATION', 'Notoʻgʻri rol', 422);
            }
            foreach ($tiers as $tier => $qty) {
                $tier = (int) $tier;
                if (! is_int($qty) || $qty < 0 || $tier < 1 || $tier > 6) {
                    throw new GameException('VALIDATION', 'Notoʻgʻri son', 422);
                }
                if ($qty === 0) {
                    continue;
                }
                $row = $player->army()->where(['role' => $role, 'tier' => $tier])->first();
                if ($row === null || $row->alive < $qty) {
                    throw new GameException('VALIDATION', 'Inda buncha askar yoʻq', 422, ['role' => $role, 'tier' => $tier]);
                }
                $clean[$role][$tier] = $qty;
                $hunters += $role === 'hunter' ? $qty : 0;
            }
        }
        if ($hunters < 1) {
            throw new GameException('VALIDATION', 'Ovga kamida bitta ovchi kerak', 422);
        }

        foreach ($clean as $role => $tiers) {
            foreach ($tiers as $tier => $qty) {
                Army::query()->where(['player_id' => $player->id, 'role' => $role, 'tier' => $tier])
                    ->update(['alive' => DB::raw('alive - '.$qty), 'on_march' => DB::raw('on_march + '.$qty)]);
            }
        }
        $back = $now->addMinutes($card['minutes']);

        return $player->marches()->create([
            'kind' => 'hunt',
            'board_window' => $board['window'],
            'board_slot' => $slot,
            'payload' => $clean,
            'loot' => Formula::huntResult($cfg, $player->level, $card, $clean) + [
                'prey' => $card['prey'],
                'km' => $card['km'],
                'casualties' => $this->casualties($clean, $card['injury'], $card['death']),
            ],
            'departs_at' => $now,
            'arrives_at' => $back,
            'returns_at' => $back,
            'state' => 'gathering',
        ]);
    }

    /**
     * Har bir yuborilgan boʻri uchun alohida tasodif: halok yoki yarador boʻlishi.
     *
     * @param  array<string, array<int, int>>  $payload
     * @return array{injured: array<string, array<int, int>>, dead: array<string, array<int, int>>}
     */
    private function casualties(array $payload, float $injury, float $death): array
    {
        $out = ['injured' => [], 'dead' => []];
        if ($injury <= 0 && $death <= 0) {
            return $out;
        }
        foreach ($payload as $role => $tiers) {
            foreach ($tiers as $tier => $qty) {
                for ($i = 0; $i < $qty; $i++) {
                    $roll = random_int(0, 999_999) / 1_000_000;
                    $kind = $roll < $death ? 'dead' : ($roll < $death + $injury ? 'injured' : null);
                    if ($kind !== null) {
                        $out[$kind][$role][$tier] = ($out[$kind][$role][$tier] ?? 0) + 1;
                    }
                }
            }
        }

        return $out;
    }

    /**
     * Ovdan qaytish: sogʻlar inga, yaradorlar tuzalish navbatiga (heal_no_hospital_min), halok boʻlganlar ketadi.
     *
     * @return array{injured: int, dead: int}
     */
    public function finish(March $march): array
    {
        $cas = $march->loot['casualties'] ?? ['injured' => [], 'dead' => []];
        $injured = 0;
        $dead = 0;
        $player = Player::query()->findOrFail($march->player_id);
        foreach ($march->payload as $role => $tiers) {
            foreach ($tiers as $tier => $qty) {
                $hurt = (int) ($cas['injured'][$role][$tier] ?? 0);
                $lost = (int) ($cas['dead'][$role][$tier] ?? 0);
                Army::query()->where(['player_id' => $march->player_id, 'role' => $role, 'tier' => (int) $tier])->update([
                    'alive' => DB::raw('alive + '.((int) $qty - $hurt - $lost)),
                    'injured' => DB::raw('injured + '.$hurt),
                    'on_march' => DB::raw('on_march - '.(int) $qty),
                ]);
                if ($hurt > 0) {
                    $player->queues()->create([
                        'kind' => 'heal', 'role' => $role, 'tier' => (int) $tier, 'qty' => $hurt, 'cost' => [],
                        'started_at' => $march->returns_at,
                        'ends_at' => $march->returns_at->addMinutes((int) GameConfig::value('heal_no_hospital_min', 180)),
                    ]);
                }
                $injured += $hurt;
                $dead += $lost;
            }
        }

        return ['injured' => $injured, 'dead' => $dead];
    }
}
