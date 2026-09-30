<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ChannelResource\Pages\ManageChannels;
use App\Models\Channel;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use UnitEnum;

class ChannelResource extends Resource
{
    protected static ?string $model = Channel::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedChatBubbleLeftRight;

    protected static string|UnitEnum|null $navigationGroup = 'Jamoa';

    protected static ?int $navigationSort = 1;

    protected static ?string $modelLabel = 'kanal';

    protected static ?string $pluralModelLabel = 'Chat kanallari';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->label('Nomi')->required(),
            TextInput::make('slug')->label('URL nomi')->required()->alphaDash()->unique(ignoreRecord: true),
            TextInput::make('description')->label('Tavsif')->columnSpanFull(),
            Select::make('icon')->label('Ikona')->options(array_combine($i = ['hash', 'megaphone', 'heart', 'shajara', 'star', 'users', 'book', 'leaf'], $i))->default('hash'),
            Toggle::make('is_readonly')->label('Faqat moderatorlar yozadi'),
            TextInput::make('position')->label('Tartib')->numeric()->default(0),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('position')
            ->reorderable('position')
            ->columns([
                TextColumn::make('name')->label('Nomi'),
                TextColumn::make('description')->label('Tavsif')->limit(50),
                IconColumn::make('is_readonly')->label('Faqat oʻqish')->boolean(),
                TextColumn::make('messages_count')->label('Xabarlar')->counts('messages'),
            ])
            ->recordActions([EditAction::make(), DeleteAction::make()])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageChannels::route('/')];
    }
}
