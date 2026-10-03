<?php

namespace App\Services;

use App\Models\Army;
use App\Models\GameConfig;
use App\Models\March;
use App\Models\Player;
use App\Support\Formula;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/** Ov: yolgʻiz (1–3 daraja) va toʻda bilan 1 soatlik ov yurishi (GDD bo'lim 4, API 6-boʻlim). */
class HuntService
{
    public function __construct(private readonly ArmyService $army) {}

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
     * Toʻda bilan ov: askarlar 1 soatga ketadi, natija qaytishda qoʻshiladi.
     *
     * @param  array<string, array<int|string, int>>  $payload  rol → {tier: soni}
     */
    public function start(Player $player, array $payload, ?CarbonImmutable $now = null): March
    {
        $now ??= CarbonImmutable::now();
        $cfg = GameConfig::allValues();
        if ($player->level < $cfg['hunter_unlock_level']) {
            throw new GameException('LEVEL_TOO_LOW', 'Toʻda ovi '.(int) $cfg['hunter_unlock_level'].'-darajadan', 400);
        }
        if ($player->marches()->where('kind', 'hunt')->whereIn('state', ['gathering', 'returning'])->exists()) {
            throw new GameException('QUEUE_BUSY', 'Toʻda allaqachon ovda', 409);
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
        $result = Formula::huntResult($cfg, $player->level, $clean);
        $back = $now->addMinutes((int) $cfg['hunt_duration_min']);

        return $player->marches()->create([
            'kind' => 'hunt',
            'payload' => $clean,
            'loot' => $result + ['prey' => Formula::PREY[$player->level][0]],
            'departs_at' => $now,
            'arrives_at' => $back,
            'returns_at' => $back,
            'state' => 'gathering',
        ]);
    }

    /** Ov qaytdi: askarlar inga qaytadi (natijani chaqiruvchi qoʻshadi). */
    public function finish(March $march): void
    {
        foreach ($march->payload as $role => $tiers) {
            foreach ($tiers as $tier => $qty) {
                Army::query()->where(['player_id' => $march->player_id, 'role' => $role, 'tier' => (int) $tier])
                    ->update(['alive' => DB::raw('alive + '.(int) $qty), 'on_march' => DB::raw('on_march - '.(int) $qty)]);
            }
        }
    }
}
