<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Channel extends Model
{
    protected $fillable = ['slug', 'name', 'icon', 'description', 'is_readonly', 'position'];

    protected function casts(): array
    {
        return ['is_readonly' => 'boolean'];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /** Eʼlonlar kanali kabi faqat oʻqiladigan kanalga faqat moderatorlar yozadi. */
    public function canPost(User $user): bool
    {
        return ! $this->is_readonly || $user->isStaff();
    }
}
