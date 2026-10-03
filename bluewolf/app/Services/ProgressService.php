<?php

namespace App\Services;

use App\Models\Building;
use App\Models\GameConfig;
use App\Models\Player;
use App\Support\Formula;

/** XP va daraja koʻtarilishi (GDD bo'lim 1). */
class ProgressService
{
    /**
     * XP qoʻshadi; chegaradan oshsa daraja koʻtariladi, yangi binolar ochiladi, In darajasi sinxronlanadi.
     *
     * @return list<int> erishilgan yangi darajalar
     */
    public function addXp(Player $player, float $xp): array
    {
        if ($xp <= 0) {
            return [];
        }
        $cfg = GameConfig::allValues();
        $player->xp = round($player->xp + $xp, 2);
        $levels = [];
        while ($player->level < 25 && $player->xp >= Formula::totalXp($cfg, $player->level + 1)) {
            $player->level++;
            $levels[] = $player->level;
        }
        $player->save();
        if ($levels) {
            $this->syncBuildings($player);
        }

        return $levels;
    }

    /** Ochilgan binolar 1-darajada bepul paydo boʻladi; In darajasi oʻyinchi darajasiga teng (GDD bo'lim 5). */
    public function syncBuildings(Player $player): void
    {
        foreach (Building::TYPES as $type => $unlockLevel) {
            if ($player->level < $unlockLevel) {
                continue;
            }
            $building = Building::query()->firstOrCreate(['player_id' => $player->id, 'type' => $type], ['level' => 1]);
            if ($type === 'den' && $building->level !== $player->level) {
                $building->update(['level' => $player->level]);
            }
        }
    }
}
