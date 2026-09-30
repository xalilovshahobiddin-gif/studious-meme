<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TimelineEventResource\Pages\ManageTimelineEvents;
use App\Models\TimelineEvent;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class TimelineEventResource extends Resource
{
    protected static ?string $model = TimelineEvent::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedClock;

    protected static string|UnitEnum|null $navigationGroup = 'Qishloq';

    protected static ?int $navigationSort = 2;

    protected static ?string $modelLabel = 'voqea';

    protected static ?string $pluralModelLabel = 'Xronologiya';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    protected static ?string $recordTitleAttribute = 'title';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('era')->label('Davr')->options(array_combine(TimelineEvent::ERAS, TimelineEvent::ERAS))->required(),
            TextInput::make('year_label')->label('Yil (matn)')->placeholder('1957 yoki X–XII asrlar')->required(),
            TextInput::make('sort_year')->label('Saralash uchun yil')->numeric(),
            TextInput::make('title')->label('Sarlavha')->required(),
            Textarea::make('body')->label('Tavsif')->rows(3)->columnSpanFull(),
            Select::make('icon')->label('Ikona')->options(array_combine(TimelineEvent::ICONS, TimelineEvent::ICONS))->default('flag'),
            Toggle::make('is_major')->label('Muhim voqea (katta belgi)'),
            TextInput::make('position')->label('Tartib')->numeric()->default(0),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('position')
            ->reorderable('position')
            ->columns([
                TextColumn::make('year_label')->label('Yil'),
                TextColumn::make('title')->label('Voqea')->searchable(),
                TextColumn::make('era')->label('Davr')->badge(),
                IconColumn::make('is_major')->label('Muhim')->boolean(),
            ])
            ->filters([SelectFilter::make('era')->label('Davr')->options(array_combine(TimelineEvent::ERAS, TimelineEvent::ERAS))])
            ->recordActions([EditAction::make(), DeleteAction::make()])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageTimelineEvents::route('/')];
    }
}
