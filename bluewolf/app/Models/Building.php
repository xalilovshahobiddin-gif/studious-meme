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

    public $timestamps = false;

    protected $fillable = ['player_id', 'type', 'level'];

    protected function casts(): array
    {
        return ['level' => 'integer'];
    }
}
