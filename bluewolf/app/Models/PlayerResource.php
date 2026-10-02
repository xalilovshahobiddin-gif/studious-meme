<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlayerResource extends Model
{
    public const RESOURCES = ['meat', 'water', 'herb', 'moonlight', 'stone', 'wood', 'hide', 'bone', 'moonstone'];

    public $timestamps = false;

    public $incrementing = false;

    protected $primaryKey = 'player_id';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['last_tick_at' => 'datetime'];
    }

    /**
     * Klientga koʻrsatiladigan butun qiymatlar.
     *
     * @return array<string, int>
     */
    public function toClient(): array
    {
        $out = [];
        foreach (self::RESOURCES as $key) {
            $out[$key] = (int) floor((float) $this->{$key});
        }

        return $out;
    }
}
