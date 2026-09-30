<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PersonResource\Pages\ManagePeople;
use App\Models\Person;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use UnitEnum;

class PersonResource extends Resource
{
    protected static ?string $model = Person::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUsers;

    protected static string|UnitEnum|null $navigationGroup = 'Shajara';

    protected static ?int $navigationSort = 1;

    protected static ?string $modelLabel = 'odam';

    protected static ?string $pluralModelLabel = 'Shajara aʼzolari';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->label('Ism-sharifi')->required()->maxLength(120),
            Select::make('gender')->label('Jinsi')->options(Person::GENDERS)->default('m')->required(),
            Select::make('clan_id')->label('Urugʻ')->relationship('clan', 'name')->required()->live()->preload(),
            Select::make('parent_id')->label('Ota yoki onasi (urugʻda)')
                ->relationship('parent', 'name', fn (Builder $query, Get $get) => $query->where('clan_id', $get('clan_id'))->whereNull('spouse_id'))
                ->getOptionLabelFromRecordUsing(fn (Person $p) => "{$p->name} ({$p->yearsLabel()})")
                ->searchable()->preload()
                ->helperText('Urugʻ asoschisi uchun boʻsh qoldiring'),
            Select::make('spouse_id')->label('Kimning turmush oʻrtogʻi')
                ->relationship('spouseOf', 'name', fn (Builder $query, Get $get) => $query->where('clan_id', $get('clan_id'))->whereNull('spouse_id'))
                ->getOptionLabelFromRecordUsing(fn (Person $p) => "{$p->name} ({$p->yearsLabel()})")
                ->searchable()->preload()
                ->helperText('Faqat urugʻga kelin/kuyov boʻlib kirganlar uchun'),
            TextInput::make('birth_year')->label('Tugʻilgan yili')->numeric()->minValue(1500)->maxValue((int) date('Y')),
            TextInput::make('death_year')->label('Vafot etgan yili')->numeric()->minValue(1500)->maxValue((int) date('Y')),
            TextInput::make('job')->label('Kasbi')->maxLength(120),
            Select::make('user_id')->label('Saytdagi akkaunti')->relationship('user', 'name')->searchable(),
            Textarea::make('bio')->label('Qisqacha hayoti')->rows(4)->columnSpanFull(),
            TextInput::make('position')->label('Farzandlar orasidagi tartib')->numeric()->default(0),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('id', 'desc')
            ->columns([
                TextColumn::make('name')->label('Ism')->searchable()->sortable(),
                TextColumn::make('clan.name')->label('Urugʻ')->badge(),
                TextColumn::make('parent.name')->label('Otasi/onasi')->placeholder('—'),
                TextColumn::make('spouseOf.name')->label('Turmush oʻrtogʻi')->placeholder('—'),
                TextColumn::make('birth_year')->label('Tugʻilgan')->sortable(),
                TextColumn::make('death_year')->label('Vafot')->placeholder('—'),
                TextColumn::make('job')->label('Kasbi')->toggleable(),
            ])
            ->filters([
                SelectFilter::make('clan_id')->label('Urugʻ')->relationship('clan', 'name'),
                SelectFilter::make('gender')->label('Jinsi')->options(Person::GENDERS),
            ])
            ->recordActions([EditAction::make(), DeleteAction::make()])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }

    public static function getPages(): array
    {
        return ['index' => ManagePeople::route('/')];
    }
}
