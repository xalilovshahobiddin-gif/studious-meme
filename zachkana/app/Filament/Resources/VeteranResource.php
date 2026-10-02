<?php

namespace App\Filament\Resources;

use App\Filament\Resources\VeteranResource\Pages\ManageVeterans;
use App\Models\Veteran;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TagsInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class VeteranResource extends Resource
{
    protected static ?string $model = Veteran::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedStar;

    protected static string|UnitEnum|null $navigationGroup = 'Qishloq';

    protected static ?int $navigationSort = 3;

    protected static ?string $modelLabel = 'faxriy';

    protected static ?string $pluralModelLabel = 'Faxriylar';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->label('Ism-sharifi')->required(),
            Select::make('category')->label('Toifa')->options(Veteran::CATEGORIES)->required(),
            TextInput::make('title')->label('Faoliyati / unvoni')->required(),
            TextInput::make('birth_year')->label('Tugʻilgan yili')->numeric(),
            TextInput::make('death_year')->label('Vafot etgan yili')->numeric(),
            Select::make('person_id')->label('Shajaradagi yozuvi')->relationship('person', 'name')->searchable(),
            TagsInput::make('medals')->label('Mukofotlar')->placeholder('Mukofot nomi va Enter'),
            FileUpload::make('photo')->label('Surat')->image()->disk('public')->directory('veterans')->imageEditor(),
            TextInput::make('short')->label('Qisqacha (kartada)')->maxLength(255)->columnSpanFull(),
            Textarea::make('quote')->label('Hikmatli soʻzi')->rows(2)->columnSpanFull(),
            Textarea::make('bio')->label('Hayot yoʻli')->rows(8)->columnSpanFull(),
            TextInput::make('position')->label('Tartib')->numeric()->default(0),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('position')
            ->columns([
                ImageColumn::make('photo')->label('')->disk('public')->circular(),
                TextColumn::make('name')->label('Ism')->searchable(),
                TextColumn::make('category')->label('Toifa')->badge()->formatStateUsing(fn ($state) => Veteran::CATEGORIES[$state] ?? $state),
                TextColumn::make('title')->label('Faoliyati'),
                TextColumn::make('memories_count')->label('Xotiralar')->counts('memories'),
            ])
            ->filters([SelectFilter::make('category')->label('Toifa')->options(Veteran::CATEGORIES)])
            ->recordActions([EditAction::make(), DeleteAction::make()])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageVeterans::route('/')];
    }
}
