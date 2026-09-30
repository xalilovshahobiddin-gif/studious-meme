<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    public const KEYS = [
        'village_name' => 'Qishloq nomi',
        'village_region' => 'Hudud',
        'population' => 'Aholi soni',
        'households' => 'Xonadonlar soni',
    ];

    public static function get(string $key, ?string $default = null): ?string
    {
        return Cache::rememberForever("setting.$key", fn () => static::find($key)?->value) ?? $default;
    }

    public static function put(string $key, ?string $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget("setting.$key");
    }

    protected static function booted(): void
    {
        static::saved(fn (Setting $s) => Cache::forget("setting.{$s->key}"));
    }
}
