<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimelineEvent extends Model
{
    protected $fillable = ['era', 'year_label', 'sort_year', 'title', 'body', 'icon', 'is_major', 'position'];

    public const ERAS = ['Qadimiy davr', 'XIX asr', 'XX asr', 'Mustaqillik'];

    public const ICONS = ['flag', 'landmark', 'map', 'leaf', 'book', 'medal', 'sun', 'star', 'users', 'heart', 'home2'];

    protected function casts(): array
    {
        return ['is_major' => 'boolean'];
    }
}
