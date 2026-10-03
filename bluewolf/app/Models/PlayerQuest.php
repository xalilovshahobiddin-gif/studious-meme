<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlayerQuest extends Model
{
    public $timestamps = false;

    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'period_key' => 'integer',
            'target' => 'integer',
            'progress' => 'float',
            'reward' => 'array',
            'claimed_at' => 'immutable_datetime',
        ];
    }
}
