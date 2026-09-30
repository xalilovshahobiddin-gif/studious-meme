<?php

namespace App\Filament\Pages;

use App\Models\Setting;
use App\Support\AuthSettings;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Actions;
use Filament\Schemas\Components\EmbeddedSchema;
use Filament\Schemas\Components\Form;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use UnitEnum;

/** Kirish usullarini yoqish/oʻchirish va Google/Telegram kalitlari — faqat administrator uchun. */
class AuthSettingsPage extends Page
{
    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedKey;

    protected static string|UnitEnum|null $navigationGroup = 'Tizim';

    protected static ?int $navigationSort = 3;

    protected static ?string $navigationLabel = 'Kirish sozlamalari';

    protected static ?string $title = 'Kirish sozlamalari';

    protected static ?string $slug = 'kirish-sozlamalari';

    /** @var array<string, mixed> */
    public ?array $data = [];

    public static function canAccess(): bool
    {
        return auth()->user()?->isAdmin() ?? false;
    }

    public function mount(): void
    {
        $this->form->fill([
            'auth_password' => AuthSettings::passwordEnabled(),
            'auth_phone' => AuthSettings::phoneEnabled(),
            'auth_google' => Setting::get('auth_google', '1') === '1',
            'google_client_id' => Setting::get('google_client_id'),
            'google_client_secret' => Setting::get('google_client_secret'),
            'auth_telegram' => Setting::get('auth_telegram', '1') === '1',
            'telegram_bot_username' => Setting::get('telegram_bot_username'),
            'telegram_bot_token' => Setting::get('telegram_bot_token'),
        ]);
    }

    public function form(Schema $schema): Schema
    {
        $host = parse_url(url('/'), PHP_URL_HOST);

        return $schema
            ->statePath('data')
            ->components([
                Section::make('Login va parol')
                    ->description('Saytda roʻyxatdan oʻtish va kirish: login + parol.')
                    ->schema([
                        Toggle::make('auth_password')->label('Yoqilgan'),
                    ]),

                Section::make('Google')
                    ->description('Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application).')
                    ->schema([
                        Toggle::make('auth_google')->label('Yoqilgan')->live(),
                        TextInput::make('google_client_id')->label('Client ID')
                            ->visible(fn (Get $get) => $get('auth_google')),
                        TextInput::make('google_client_secret')->label('Client Secret')->password()->revealable()
                            ->visible(fn (Get $get) => $get('auth_google')),
                        TextInput::make('google_redirect')->label('Authorized redirect URI (Google’ga shuni kiriting)')
                            ->default(url('/auth/google/callback'))->disabled()->dehydrated(false)
                            ->formatStateUsing(fn () => url('/auth/google/callback'))
                            ->visible(fn (Get $get) => $get('auth_google')),
                    ]),

                Section::make('Telegram')
                    ->description("@BotFather’da bot yarating, keyin /setdomain buyrugʻi bilan domen sifatida {$host} ni kiriting.")
                    ->schema([
                        Toggle::make('auth_telegram')->label('Yoqilgan')->live(),
                        TextInput::make('telegram_bot_username')->label('Bot nomi')->placeholder('zachkana_bot')
                            ->prefix('@')
                            ->visible(fn (Get $get) => $get('auth_telegram')),
                        TextInput::make('telegram_bot_token')->label('Bot tokeni')->password()->revealable()
                            ->placeholder('123456789:AA…')
                            ->visible(fn (Get $get) => $get('auth_telegram')),
                    ]),

                Section::make('Telefon raqam (SMS)')
                    ->description('Vaqtincha oʻchirilgan. Kod saqlangan — SMS xizmati ulangach yoqiladi.')
                    ->collapsed()
                    ->schema([
                        Toggle::make('auth_phone')->label('Yoqilgan'),
                    ]),
            ]);
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Form::make([EmbeddedSchema::make('form')])
                ->id('form')
                ->livewireSubmitHandler('save')
                ->footer([
                    Actions::make([
                        Action::make('save')->label('Saqlash')->submit('save')->keyBindings(['mod+s']),
                    ]),
                ]),
        ]);
    }

    public function save(): void
    {
        $data = $this->form->getState();

        foreach (['auth_password', 'auth_phone', 'auth_google', 'auth_telegram'] as $key) {
            Setting::put($key, ! empty($data[$key]) ? '1' : '0');
        }
        // Yashirin maydonlar (oʻchirilgan usul) saqlangan qiymatni oʻchirmaydi
        foreach (['google_client_id', 'google_client_secret', 'telegram_bot_username', 'telegram_bot_token'] as $key) {
            if (array_key_exists($key, $data)) {
                Setting::put($key, filled($data[$key]) ? ltrim(trim($data[$key]), '@') : null);
            }
        }

        $warn = [];
        if (! empty($data['auth_google']) && ! AuthSettings::google()) {
            $warn[] = 'Google uchun Client ID va Secret kiriting';
        }
        if (! empty($data['auth_telegram']) && ! AuthSettings::telegram()) {
            $warn[] = 'Telegram uchun bot nomi va tokenini kiriting';
        }
        if (! AuthSettings::passwordEnabled() && ! AuthSettings::google() && ! AuthSettings::telegram() && ! AuthSettings::phoneEnabled()) {
            $warn[] = 'Hech qanday kirish usuli yoqilmagan — saytga hech kim kira olmaydi';
        }

        $n = Notification::make()->title('Saqlandi');
        $warn ? $n->warning()->body(implode('. ', $warn).'.')->send() : $n->success()->send();
    }
}
