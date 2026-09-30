<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Oilaviy shajara aʼzosi. parent_id — ota/ona, spouse_id — kimning turmush oʻrtogʻi. */
class FamilyMember extends Model
{
    protected $fillable = ['user_id', 'parent_id', 'spouse_id', 'name', 'gender', 'birth_year', 'death_year', 'job', 'bio', 'is_me', 'position'];

    protected function casts(): array
    {
        return ['is_me' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function children(): HasMany
    {
        return $this->hasMany(FamilyMember::class, 'parent_id');
    }

    public function spouses(): HasMany
    {
        return $this->hasMany(FamilyMember::class, 'spouse_id');
    }

    public function toFront(): array
    {
        return [
            'id' => (string) $this->id,
            'parent' => $this->parent_id ? (string) $this->parent_id : null,
            'spouseOf' => $this->spouse_id ? (string) $this->spouse_id : null,
            'name' => $this->name,
            'g' => $this->gender,
            'b' => $this->birth_year,
            'd' => $this->death_year,
            'job' => $this->job,
            'bio' => $this->bio,
            'me' => $this->is_me,
        ];
    }
}
