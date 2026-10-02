<?php

namespace Database\Seeders;

use App\Models\GameConfig;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;

/**
 * game_config ni data/game_config.json dan toʻldiradi.
 * JSON ni docs/blue_wolf/tools/blue_wolf_config.py Excel "Sozlamalar" varagʻidan yaratadi —
 * qoʻlda tahrirlamang.
 */
class GameConfigSeeder extends Seeder
{
    public function run(): void
    {
        $rows = json_decode((string) file_get_contents(__DIR__.'/data/game_config.json'), true, flags: JSON_THROW_ON_ERROR);

        foreach (array_chunk($rows, 100) as $chunk) {
            GameConfig::query()->upsert($chunk, ['config_key'], ['config_value', 'unit', 'note']);
        }

        Cache::forget('game_config');
    }
}
