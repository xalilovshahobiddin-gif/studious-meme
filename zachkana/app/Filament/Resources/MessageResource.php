<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MessageResource\Pages\ManageMessages;
use App\Models\Message;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\RestoreAction;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use UnitEnum;

class MessageResource extends Resource
{
    protected static ?string $model = Message::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedChatBubbleBottomCenterText;

    protected static string|UnitEnum|null $navigationGroup = 'Jamoa';

    protected static ?int $navigationSort = 2;

    protected static ?string $modelLabel = 'xabar';

    protected static ?string $pluralModelLabel = 'Chat xabarlari';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    protected static ?string $recordTitleAttribute = 'body';

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->withoutGlobalScopes([SoftDeletingScope::class])->with(['user:id,name', 'channel:id,name']);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([

        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('id', 'desc')
            ->columns([
                TextColumn::make('created_at')->label('Vaqt')->dateTime('d.m.Y H:i')->sortable(),
                TextColumn::make('channel.name')->label('Kanal')->badge(),
                TextColumn::make('user.name')->label('Muallif')->searchable(),
                TextColumn::make('body')->label('Xabar')->searchable()->wrap()->limit(200),
            ])
            ->filters([
                SelectFilter::make('channel_id')->label('Kanal')->relationship('channel', 'name'),
                TrashedFilter::make()->label('Oʻchirilganlar'),
            ])
            ->recordActions([DeleteAction::make(), RestoreAction::make()])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageMessages::route('/')];
    }
}
