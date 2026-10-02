<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use SoftDeletes;

    protected $fillable = ['channel_id', 'user_id', 'reply_to_id', 'body'];

    protected function casts(): array
    {
        return ['reacted_at' => 'datetime'];
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(MessageReaction::class);
    }

    /**
     * Reaksiyalar: [{e: '👍', n: 3, me: true}, ...] — MessageReaction::EMOJI tartibida.
     *
     * @return list<array{e: string, n: int, me: bool}>
     */
    public function reactionSummary(?int $meId): array
    {
        $all = $this->relationLoaded('reactions') ? $this->reactions : $this->reactions()->get();

        return collect(MessageReaction::EMOJI)
            ->map(fn ($e) => $all->where('emoji', $e))
            ->filter(fn ($rows) => $rows->isNotEmpty())
            ->map(fn ($rows, $i) => ['e' => MessageReaction::EMOJI[$i], 'n' => $rows->count(), 'me' => $meId !== null && $rows->contains('user_id', $meId)])
            ->values()->all();
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_id')->withTrashed();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
