<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Veteran extends Model
{
    protected $fillable = ['person_id', 'name', 'category', 'title', 'birth_year', 'death_year', 'medals', 'short', 'bio', 'quote', 'photo', 'position'];

    public const CATEGORIES = [
        'urush' => 'Urush qatnashchilari',
        'mehnat' => 'Mehnat faxriylari',
        'ustoz' => 'Ustozlar',
        'shifokor' => 'Shifokorlar',
    ];

    protected function casts(): array
    {
        return ['medals' => 'array'];
    }

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }

    public function memories(): HasMany
    {
        return $this->hasMany(Memory::class);
    }

    public function approvedMemories(): HasMany
    {
        return $this->memories()->where('status', 'approved')->latest();
    }
}
