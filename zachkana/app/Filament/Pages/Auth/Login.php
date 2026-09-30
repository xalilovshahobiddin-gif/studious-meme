<?php

namespace App\Filament\Pages\Auth;

use App\Models\User;
use App\Support\AuthSettings;
use Filament\Auth\Pages\Login as BaseLogin;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Component;
use Filament\Schemas\Schema;
use Illuminate\Validation\ValidationException;
use SensitiveParameter;

/**
 * Admin panelga login va parol bilan kiriladi. Telefon orqali kirish sozlamadan
 * yoqilgan boʻlsa, telefon raqamni ham kiritish mumkin.
 * Google/Telegram orqali kirgan xodim saytdan kirib, toʻgʻridan-toʻgʻri /admin ga oʻtadi.
 */
class Login extends BaseLogin
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            $this->getLoginFormComponent(),
            $this->getPasswordFormComponent(),
            $this->getRememberFormComponent(),
        ]);
    }

    protected function getLoginFormComponent(): Component
    {
        return TextInput::make('login')
            ->label(AuthSettings::phoneEnabled() ? 'Login yoki telefon raqam' : 'Login')
            ->required()
            ->autocomplete('username')
            ->autofocus();
    }

    protected function getCredentialsFromFormData(#[SensitiveParameter] array $data): array
    {
        $login = trim($data['login']);

        if (AuthSettings::phoneEnabled() && preg_match('/^\+?[\d\s()-]{9,}$/', $login) && ! User::where('username', $login)->exists()) {
            return ['phone' => User::normalizePhone($login), 'password' => $data['password']];
        }

        return ['username' => mb_strtolower($login), 'password' => $data['password']];
    }

    protected function throwFailureValidationException(): never
    {
        throw ValidationException::withMessages([
            'data.login' => 'Login yoki parol notoʻgʻri.',
        ]);
    }
}
