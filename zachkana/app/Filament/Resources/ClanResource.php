<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ClanResource\Pages\ManageClans;
use App\Models\Clan;
use App\Models\Person;
use App\Models\PersonSuggestion;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Support\Facades\DB;
use UnitEnum;

class ClanResource extends Resource
{
    protected static ?string $model = Clan::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUserGroup;

    protected static string|UnitEnum|null $navigationGroup = 'Shajara';

    protected static ?int $navigationSort = 2;

    // "Avlod" — bir bobokalonning avlodlari (bitta daraxt). Qabila urugʻi — tribe maydoni.
    protected static ?string $modelLabel = 'avlod';

    protected static ?string $pluralModelLabel = 'Avlodlar';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->label('Nomi')->required()->maxLength(120)
                ->helperText('Bobokalon nomi bilan, masalan: Mirzaboy ota avlodi yoki Mirzaboylar'),
            TextInput::make('slug')->label('URL nomi')->helperText('Lotin harflarida, masalan: mirzaboy')->required()->alphaDash()->unique(ignoreRecord: true),
            TextInput::make('tribe')->label('Urugʻi (ixtiyoriy)')->maxLength(60)
                ->datalist(Clan::TRIBES)
                ->helperText('Qovchin, barlos, xoʻja… Maʼlum boʻlsa yozing — saytda shu boʻyicha saralash mumkin boʻladi.'),
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
                TextColumn::make('tribe')->label('Urugʻi')->badge()->color('gray')->placeholder('—')->searchable(),
                TextColumn::make('slug')->label('URL')->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('people_count')->label('Aʼzolar')->counts('people'),
                TextColumn::make('position')->label('Tartib')->sortable(),
            ])
            ->recordActions([
                EditAction::make(),
                // Ikki shox bir odamga borib taqalsa: bu avlod boshini boshqa avloddagi odamning farzandi qilib ulash
                Action::make('attach')->label('Boshqa avlodga ulash')->icon(Heroicon::OutlinedLink)->color('gray')
                    ->modalDescription(fn (Clan $record) => 'Bu avlod boshi ('.($record->founder()?->name ?? '—').') tanlangan odamning farzandi boʻladi. Barcha aʼzolar oʻsha avlodga koʻchadi, bu avlod oʻchiriladi.')
                    ->schema(fn (Clan $record) => [
                        Select::make('person_id')->label('Kimning farzandi?')->required()->searchable()
                            ->getSearchResultsUsing(fn (string $search) => Person::with('clan:id,name')
                                ->where('clan_id', '!=', $record->id)->whereNull('spouse_id')
                                ->where('name', 'like', "%{$search}%")->limit(30)->get()
                                ->mapWithKeys(fn (Person $p) => [$p->id => "{$p->name}".($p->birth_year ? " ({$p->birth_year})" : '')." — {$p->clan?->name}"]))
                            ->getOptionLabelUsing(fn ($value) => Person::find($value)?->name),
                    ])
                    ->disabled(fn (Clan $record) => ! $record->founder())
                    ->action(function (Clan $record, array $data) {
                        $target = Person::findOrFail($data['person_id']);
                        $founder = $record->founder();
                        DB::transaction(function () use ($record, $target, $founder) {
                            $founder->update(['parent_id' => $target->id]);
                            Person::where('clan_id', $record->id)->update(['clan_id' => $target->clan_id]);
                            PersonSuggestion::where('clan_id', $record->id)->update(['clan_id' => $target->clan_id]);
                            $record->delete();
                        });
                        Notification::make()->success()->title("{$founder->name} → {$target->name}ning farzandi")->body("Aʼzolar “{$target->clan->name}” avlodiga koʻchirildi.")->send();
                    }),
                DeleteAction::make(),
            ])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageClans::route('/')];
    }
}
