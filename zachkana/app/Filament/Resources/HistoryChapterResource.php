<?php

namespace App\Filament\Resources;

use App\Filament\Resources\HistoryChapterResource\Pages\ManageHistoryChapters;
use App\Models\HistoryChapter;
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

class HistoryChapterResource extends Resource
{
    protected static ?string $model = HistoryChapter::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBookOpen;

    protected static string|UnitEnum|null $navigationGroup = 'Qishloq';

    protected static ?int $navigationSort = 1;

    protected static ?string $modelLabel = 'bob';

    protected static ?string $pluralModelLabel = 'Tarix boblari';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    protected static ?string $recordTitleAttribute = 'title';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('title')->label('Sarlavha')->required()->maxLength(160),
            TextInput::make('slug')->label('URL nomi')->required()->alphaDash()->unique(ignoreRecord: true),
            Textarea::make('body')->label('Matn')->helperText('Xatboshilarni boʻsh qator bilan ajrating')->rows(12)->required()->columnSpanFull(),
            Textarea::make('quote_text')->label('Iqtibos (ixtiyoriy)')->rows(2),
            TextInput::make('quote_cite')->label('Iqtibos muallifi'),
            TextInput::make('position')->label('Tartib')->numeric()->default(0),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('position')
            ->reorderable('position')
            ->columns([
                TextColumn::make('position')->label('#'),
                TextColumn::make('title')->label('Sarlavha')->searchable(),
                TextColumn::make('updated_at')->label('Yangilangan')->since(),
            ])
            ->recordActions([EditAction::make(), DeleteAction::make()])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageHistoryChapters::route('/')];
    }
}
