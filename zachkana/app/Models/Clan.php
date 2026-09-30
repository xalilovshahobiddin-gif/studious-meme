<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Clan extends Model
{
    protected $fillable = ['slug', 'name', 'description', 'position'];

    public function people(): HasMany
    {
        return $this->hasMany(Person::class);
    }

    /** Urugʻ asoschisi: ota-onasi ham, turmush oʻrtogʻi ham koʻrsatilmagan birinchi odam. */
    public function founder(): ?Person
    {
        return $this->people()->whereNull('parent_id')->whereNull('spouse_id')->orderBy('position')->orderBy('id')->first();
    }
}
