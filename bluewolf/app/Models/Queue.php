<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Queue extends Model
{
    public $timestamps = false;

    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'cost' => 'array',
            'target_level' => 'integer',
            'slot' => 'integer',
            'speeded_sec' => 'integer',
            'started_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
        ];
    }

    /** @return array<string, mixed> */
    public function toClient(): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'slot' => $this->slot,
            'building_type' => $this->building_type,
            'target_level' => $this->target_level,
            'cost' => $this->cost,
            'started_at' => $this->started_at->getTimestampMs(),
            'ends_at' => $this->ends_at->getTimestampMs(),
        ];
    }
}
