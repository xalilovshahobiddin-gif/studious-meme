<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ClanResource\Pages\ManageClans;
use App\Models\Clan;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use UnitEnum;

class ClanResource extends Resource
{
    protected static ?string $model = Clan::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUserGroup;

    protected static string|UnitEnum|null $navigationGroup = 'Shajara';

    protected static ?int $navigationSort = 2;

    protected static ?string $modelLabel = 'urugʻ';

    protected static ?string $pluralModelLabel = 'Urugʻlar';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->label('Nomi')->required()->maxLength(120),
            TextInput::make('slug')->label('URL nomi')->helperText('Lotin harflarida, masalan: mirzaboy')->required()->alphaDash()->unique(ignoreRecord: true),
            Textarea::make('description')->label('Tavsif')->columnSpanFull(),
            TextInput::make('position')->label('Tartib')->numeric()->default(0),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('position')
            ->columns([
                TextColumn::make('name')->label('Nomi')->searchable(),
                TextColumn::make('slug')->label('URL'),
                TextColumn::make('people_count')->label('Aʼzolar')->counts('people'),
                TextColumn::make('position')->label('Tartib')->sortable(),
            ])
            ->recordActions([EditAction::make(), DeleteAction::make()])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageClans::route('/')];
    }
}
