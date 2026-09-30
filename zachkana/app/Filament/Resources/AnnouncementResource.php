<?php

namespace App\Filament\Resources;

use App\Filament\Resources\AnnouncementResource\Pages\ManageAnnouncements;
use App\Models\Announcement;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use UnitEnum;

class AnnouncementResource extends Resource
{
    protected static ?string $model = Announcement::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedMegaphone;

    protected static string|UnitEnum|null $navigationGroup = 'Qishloq';

    protected static ?int $navigationSort = 4;

    protected static ?string $modelLabel = 'eʼlon';

    protected static ?string $pluralModelLabel = 'Eʼlonlar va yangiliklar';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    protected static ?string $recordTitleAttribute = 'title';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('type')->label('Turi')->options(Announcement::TYPES)->default('elon')->required(),
            DateTimePicker::make('published_at')->label('Chop etish vaqti')->default(now())->helperText('Boʻsh qolsa — qoralama'),
            TextInput::make('title')->label('Sarlavha')->required()->columnSpanFull(),
            Textarea::make('body')->label('Matn')->rows(4)->required()->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('published_at', 'desc')
            ->columns([
                TextColumn::make('type')->label('Turi')->badge()->formatStateUsing(fn ($state) => Announcement::TYPES[$state] ?? $state),
                TextColumn::make('title')->label('Sarlavha')->searchable()->limit(60),
                TextColumn::make('published_at')->label('Chop etilgan')->dateTime('d.m.Y H:i')->placeholder('Qoralama')->sortable(),
            ])
            ->recordActions([EditAction::make(), DeleteAction::make()])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageAnnouncements::route('/')];
    }
}
