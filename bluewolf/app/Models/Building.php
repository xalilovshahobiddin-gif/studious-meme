<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Building extends Model
{
    /** GDD bo'lim 5: In (avtomatik) + 8 ta quriladigan bino, ochilish darajasi bilan. */
    public const TYPES = [
        'den' => 1,
        'food_cave' => 2,
        'workshop' => 2,
        'hunt_path' => 3,
        'battle_ground' => 4,
        'scout_rock' => 4,
        'defense_wall' => 4,
        'hospital' => 6,
        'market' => 9,
    ];

    /**
     * Narx va vaqt kalitlari (game_config). Klientdagi public/js/game.js → BUILDINGS bilan bir xil.
     * cost: bazaviy narx (1→2 daraja); role: rol binosi (cost_role_* × cost_coef_<role>); time: vaqt koeffitsienti.
     */
    public const META = [
        'food_cave' => ['time' => 'time_coef_food_cave', 'cost' => ['stone' => 'cost_food_cave_stone', 'wood' => 'cost_food_cave_wood']],
        'workshop' => ['time' => 'time_coef_workshop', 'cost' => ['stone' => 'cost_workshop_stone', 'wood' => 'cost_workshop_wood', 'bone' => 'cost_workshop_bone']],
        'hunt_path' => ['time' => 'time_coef_hunt_path', 'role' => 'hunt_path'],
        'battle_ground' => ['time' => 'time_coef_battle_ground', 'role' => 'battle_ground'],
        'scout_rock' => ['time' => 'time_coef_scout_rock', 'role' => 'scout_rock'],
        'defense_wall' => ['time' => 'time_coef_defense_wall', 'role' => 'defense_wall'],
        'hospital' => ['time' => 'time_coef_hospital', 'cost' => ['wood' => 'cost_hospital_wood', 'hide' => 'cost_hospital_hide', 'stone' => 'cost_hospital_stone']],
        'market' => ['time' => 'time_coef_market', 'cost' => ['stone' => 'cost_market_stone', 'wood' => 'cost_market_wood']],
    ];

    public $timestamps = false;

    protected $fillable = ['player_id', 'type', 'level'];

    protected function casts(): array
    {
        return ['level' => 'integer'];
    }
}
