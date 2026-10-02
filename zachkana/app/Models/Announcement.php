<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $fillable = ['type', 'title', 'body', 'published_at'];

    public const TYPES = ['elon' => 'Eʼlon', 'yangilik' => 'Yangilik', 'marosim' => 'Marosim'];

    public const TONES = ['elon' => 'accent', 'yangilik' => 'primary', 'marosim' => 'success'];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    public function scopePublished(Builder $q): Builder
    {
        return $q->whereNotNull('published_at')->where('published_at', '<=', now());
    }
}
