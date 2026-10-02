<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Player extends Model
{
    public $timestamps = false;

    protected $fillable = ['tg_id', 'tg_username', 'display_name', 'lang', 'level', 'xp', 'tutorial_step', 'status', 'last_seen_at'];

    protected function casts(): array
    {
        return [
            'tg_id' => 'integer',
            'level' => 'integer',
            'xp' => 'integer',
            'tutorial_step' => 'integer',
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
}
