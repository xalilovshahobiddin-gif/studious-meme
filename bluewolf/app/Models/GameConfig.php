<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Balans parametrlari. Kodda raqam qattiq yozilmaydi — hammasi shu yerdan.
 * Qiymatlar manbai: docs/blue_wolf/blue_wolf_darajalar.xlsx → Sozlamalar.
 */
class GameConfig extends Model
{
    protected $table = 'game_config';

    protected $primaryKey = 'config_key';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected $guarded = [];

    /** @return array<string, float> */
    public static function allValues(): array
    {
        return Cache::remember('game_config', 300, fn () => static::query()
            ->pluck('config_value', 'config_key')
            ->map(fn ($v) => (float) $v)
            ->all());
    }

    public static function value(string $key, ?float $default = null): ?float
    {
        return static::allValues()[$key] ?? $default;
    }
}
