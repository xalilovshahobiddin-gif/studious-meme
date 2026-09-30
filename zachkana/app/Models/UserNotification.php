<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Foydalanuvchining shaxsiy bildirishnomasi. url — saytdagi manzil (masalan #/chat/umumiy/15). */
class UserNotification extends Model
{
    protected $fillable = ['user_id', 'type', 'title', 'body', 'url', 'read_at'];

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function send(?int $userId, string $type, string $title, ?string $body = null, ?string $url = null): void
    {
        if ($userId) {
            static::create(['user_id' => $userId, 'type' => $type, 'title' => $title, 'body' => $body, 'url' => $url]);
        }
    }
}
