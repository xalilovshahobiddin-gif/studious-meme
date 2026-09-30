<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Submission extends Model
{
    protected $fillable = ['user_id', 'type', 'author_name', 'subject', 'category', 'body', 'attachment', 'status'];

    public const TYPES = ['history' => 'Tarix materiali', 'veteran' => 'Faxriy taklifi'];

    public const STATUSES = ['pending' => 'Yangi', 'reviewed' => 'Koʻrib chiqilgan'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
