<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MemoryResource\Pages\ManageMemories;
use App\Models\Memory;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

/** Faxriylar haqidagi xotiralar — moderator tasdiqlagach saytda chiqadi. */
class MemoryResource extends Resource
{
    protected static ?string $model = Memory::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedHeart;

    protected static string|UnitEnum|null $navigationGroup = 'Qishloq';

    protected static ?int $navigationSort = 5;

    protected static ?string $modelLabel = 'xotira';

    protected static ?string $pluralModelLabel = 'Xotiralar';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getNavigationBadge(): ?string
    {
        $n = Memory::where('status', 'pending')->count();

        return $n ? (string) $n : null;
    }

    public static function getNavigationBadgeColor(): string|array|null
    {
        return 'warning';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('author_name')->label('Muallif')->required(),
            Select::make('status')->label('Holati')->options(Memory::STATUSES)->required(),
            Textarea::make('body')->label('Matn')->rows(5)->required()->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('id', 'desc')
            ->columns([
                TextColumn::make('created_at')->label('Sana')->dateTime('d.m.Y H:i'),
                TextColumn::make('veteran.name')->label('Faxriy'),
                TextColumn::make('author_name')->label('Muallif'),
                TextColumn::make('body')->label('Xotira')->wrap()->limit(160),
                TextColumn::make('status')->label('Holati')->badge()
                    ->formatStateUsing(fn ($state) => Memory::STATUSES[$state] ?? $state)
                    ->color(fn ($state) => match ($state) {
                        'approved' => 'success', 'rejected' => 'danger', default => 'warning'
                    }),
            ])
            ->filters([SelectFilter::make('status')->label('Holati')->options(Memory::STATUSES)])
            ->recordActions([
                Action::make('approve')->label('Tasdiqlash')->icon(Heroicon::OutlinedCheck)->color('success')
                    ->visible(fn (Memory $m) => $m->status !== 'approved')
                    ->action(fn (Memory $m) => $m->update(['status' => 'approved'])),
                EditAction::make(),
                DeleteAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageMemories::route('/')];
    }
}
