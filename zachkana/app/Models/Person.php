<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Person extends Model
{
    protected $table = 'people';

    protected $fillable = ['clan_id', 'parent_id', 'spouse_id', 'user_id', 'name', 'gender', 'birth_year', 'death_year', 'job', 'bio', 'position', 'photo'];

    public const GENDERS = ['m' => 'Erkak', 'f' => 'Ayol'];

    public function clan(): BelongsTo
    {
        return $this->belongsTo(Clan::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Person::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Person::class, 'parent_id')->orderBy('position')->orderBy('birth_year')->orderBy('id');
    }

    /** Urugʻga kelin/kuyov boʻlib kirganlar */
    public function spouses(): HasMany
    {
        return $this->hasMany(Person::class, 'spouse_id');
    }

    /** Bu odam kelin/kuyov boʻlsa — urugʻdagi turmush oʻrtogʻi */
    public function spouseOf(): BelongsTo
    {
        return $this->belongsTo(Person::class, 'spouse_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function yearsLabel(): string
    {
        if ($this->death_year) {
            return ($this->birth_year ?? '?').'–'.$this->death_year;
        }

        return $this->birth_year ? $this->birth_year.'-y.t.' : '';
    }
}
