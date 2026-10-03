<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class March extends Model
{
    public $timestamps = false;

    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'loot' => 'array',
            'departs_at' => 'immutable_datetime',
            'arrives_at' => 'immutable_datetime',
            'returns_at' => 'immutable_datetime',
        ];
    }

    /** @return array<string, mixed> */
    public function toClient(): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'payload' => $this->payload,
            'board_window' => $this->board_window,
            'board_slot' => $this->board_slot,
            // Yarador/halok qaytishgacha sir — faqat xavf ehtimoli kartada koʻrinadi
            'loot' => array_diff_key($this->loot ?? [], ['casualties' => 1]),
            'departs_at' => $this->departs_at->getTimestampMs(),
            'returns_at' => $this->returns_at?->getTimestampMs(),
        ];
    }
}
