<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages\ManageUsers;
use App\Models\User;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Hash;
use UnitEnum;

/** Foydalanuvchilar va rollar — faqat administrator uchun. */
class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedIdentification;

    protected static string|UnitEnum|null $navigationGroup = 'Tizim';

    protected static ?int $navigationSort = 1;

    protected static ?string $modelLabel = 'foydalanuvchi';

    protected static ?string $pluralModelLabel = 'Foydalanuvchilar';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    protected static ?string $recordTitleAttribute = 'name';

    public static function canViewAny(): bool
    {
        return auth()->user()?->isAdmin() ?? false;
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->label('Ismi')->required()->maxLength(80),
            TextInput::make('phone')->label('Telefon')->tel()->required()->unique(ignoreRecord: true)
                ->dehydrateStateUsing(fn ($state) => User::normalizePhone($state))
                ->helperText('998901234567 koʻrinishida'),
            Select::make('role')->label('Rol')->options(User::ROLES)->required()->default('user'),
            TextInput::make('password')->label('Parol')->password()->revealable()
                ->required(fn (string $operation) => $operation === 'create')
                ->dehydrated(fn ($state) => filled($state))
                ->dehydrateStateUsing(fn ($state) => Hash::make($state))
                ->minLength(6)
                ->helperText('Tahrirlashda boʻsh qoldirsangiz, parol oʻzgarmaydi'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('id', 'desc')
            ->columns([
                TextColumn::make('name')->label('Ismi')->searchable(),
                TextColumn::make('phone')->label('Telefon')->searchable(),
                TextColumn::make('role')->label('Rol')->badge()
                    ->formatStateUsing(fn ($state) => User::ROLES[$state] ?? $state)
                    ->color(fn ($state) => match ($state) {
                        'admin' => 'danger', 'moderator' => 'warning', default => 'gray'
                    }),
                TextColumn::make('messages_count')->label('Xabarlar')->counts('messages'),
                TextColumn::make('created_at')->label('Roʻyxatdan oʻtgan')->dateTime('d.m.Y')->sortable(),
            ])
            ->filters([SelectFilter::make('role')->label('Rol')->options(User::ROLES)])
            ->recordActions([EditAction::make()]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageUsers::route('/')];
    }
}
