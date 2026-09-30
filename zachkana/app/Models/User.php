<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'username', 'phone', 'email', 'password', 'role', 'google_id', 'telegram_id', 'avatar'])]
#[Hidden(['password', 'remember_token', 'google_id', 'telegram_id'])]
class User extends Authenticatable implements FilamentUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const ROLES = ['user' => 'Foydalanuvchi', 'moderator' => 'Moderator', 'admin' => 'Administrator'];

    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
            'notifications_seen_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /** Admin panelga faqat moderator va administratorlar kiradi. */
    public function canAccessPanel(Panel $panel): bool
    {
        return $this->isStaff();
    }

    public function isStaff(): bool
    {
        return in_array($this->role, ['moderator', 'admin'], true);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function person(): HasOne
    {
        return $this->hasOne(Person::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /** Qaysi usullar bilan kira oladi (admin panel va profil uchun) */
    public function loginMethods(): array
    {
        return array_keys(array_filter([
            'password' => $this->username && $this->password,
            'google' => (bool) $this->google_id,
            'telegram' => (bool) $this->telegram_id,
            'phone' => $this->phone && $this->password,
        ]));
    }

    /** Login: lotin harflari, raqamlar, "_" va "." — 3–32 belgi */
    public const USERNAME_RULE = 'regex:/^[a-z0-9_.]{3,32}$/';

    /** +998 90 123 45 67 → 998901234567 */
    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if (strlen($digits) === 9) {
            $digits = '998'.$digits;
        }

        return $digits;
    }
}
