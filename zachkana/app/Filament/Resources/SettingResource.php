<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SettingResource\Pages\ManageSettings;
use App\Models\Setting;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use UnitEnum;

class SettingResource extends Resource
{
    protected static ?string $model = Setting::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedCog6Tooth;

    protected static string|UnitEnum|null $navigationGroup = 'Tizim';

    protected static ?int $navigationSort = 2;

    protected static ?string $modelLabel = 'sozlama';

    protected static ?string $pluralModelLabel = 'Qishloq sozlamalari';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    protected static ?string $recordTitleAttribute = 'key';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('key')->label('Sozlama')->options(Setting::KEYS)->required()->disabledOn('edit'),
            TextInput::make('value')->label('Qiymati'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('key')->label('Sozlama')->formatStateUsing(fn ($state) => Setting::KEYS[$state] ?? $state),
                TextColumn::make('value')->label('Qiymati'),
            ])
            ->recordActions([EditAction::make()])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageSettings::route('/')];
    }
}
