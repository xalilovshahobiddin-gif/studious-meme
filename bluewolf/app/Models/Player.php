<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Player extends Model
{
    public $timestamps = false;

    /** last_seen_at / last_tick_at — DATETIME(3), millisekundlar resurs hisobi uchun kerak. */
    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $fillable = ['tg_id', 'tg_username', 'display_name', 'lang', 'level', 'xp', 'tutorial_step', 'status', 'last_seen_at', 'free_speedups', 'second_queue_early', 'solo_hunt_at',
        'login_day_key', 'login_claimed_key', 'login_streak', 'combo_day_key', 'combo_streak'];

    protected function casts(): array
    {
        return [
            'tg_id' => 'integer',
            'level' => 'integer',
            'xp' => 'float',
            'solo_hunt_at' => 'immutable_datetime',
            'login_day_key' => 'integer',
            'login_claimed_key' => 'integer',
            'login_streak' => 'integer',
            'combo_day_key' => 'integer',
            'combo_streak' => 'integer',
            'tutorial_step' => 'integer',
            'free_speedups' => 'integer',
            'second_queue_early' => 'boolean',
            'created_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    public function resources(): HasOne
    {
        return $this->hasOne(PlayerResource::class);
    }

    public function buildings(): HasMany
    {
        return $this->hasMany(Building::class);
    }

    public function army(): HasMany
    {
        return $this->hasMany(Army::class);
    }

    public function marches(): HasMany
    {
        return $this->hasMany(March::class);
    }

    public function quests(): HasMany
    {
        return $this->hasMany(PlayerQuest::class);
    }

    public function queues(): HasMany
    {
        return $this->hasMany(Queue::class);
    }

    /** Qurilish navbati slotlari: 1, 10-darajadan (yoki erta xarid bilan) 2. */
    public function buildSlots(): int
    {
        return $this->second_queue_early || $this->level >= GameConfig::value('second_queue_free_level', 10) ? 2 : 1;
    }
}
