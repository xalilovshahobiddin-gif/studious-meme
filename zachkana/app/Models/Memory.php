<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Memory extends Model
{
    protected $fillable = ['veteran_id', 'user_id', 'author_name', 'body', 'status'];

    public const STATUSES = ['pending' => 'Kutilmoqda', 'approved' => 'Tasdiqlangan', 'rejected' => 'Rad etilgan'];

    public function veteran(): BelongsTo
    {
        return $this->belongsTo(Veteran::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
