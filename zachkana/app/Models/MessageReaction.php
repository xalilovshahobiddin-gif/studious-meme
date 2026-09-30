<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageReaction extends Model
{
    /** Chatda ruxsat etilgan reaksiyalar */
    public const EMOJI = ['👍', '❤️', '🤲', '👏', '😊'];

    protected $fillable = ['message_id', 'user_id', 'emoji'];
}
