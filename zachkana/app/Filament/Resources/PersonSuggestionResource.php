<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PersonSuggestionResource\Pages\ManagePersonSuggestions;
use App\Models\PersonSuggestion;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

/** Foydalanuvchilarning shajara takliflari: tasdiqlash yoki rad etish. */
class PersonSuggestionResource extends Resource
{
    protected static ?string $model = PersonSuggestion::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedInboxArrowDown;

    protected static string|UnitEnum|null $navigationGroup = 'Shajara';

    protected static ?int $navigationSort = 3;

    protected static ?string $modelLabel = 'taklif';

    protected static ?string $pluralModelLabel = 'Shajara takliflari';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getNavigationBadge(): ?string
    {
        $n = PersonSuggestion::where('status', 'pending')->count();

        return $n ? (string) $n : null;
    }

    public static function getNavigationBadgeColor(): string|array|null
    {
        return 'warning';
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('id', 'desc')
            ->modifyQueryUsing(fn ($query) => $query->with(['user', 'clan', 'person', 'parent']))
            ->columns([
                TextColumn::make('created_at')->label('Sana')->dateTime('d.m.Y H:i')->sortable(),
                TextColumn::make('type')->label('Turi')->badge()
                    ->formatStateUsing(fn ($state) => $state === 'add' ? 'Qoʻshish' : 'Tuzatish')
                    ->color(fn ($state) => $state === 'add' ? 'success' : 'info'),
                TextColumn::make('payload.name')->label('Ism')->placeholder(fn ($record) => $record->person?->name ?? '—'),
                TextColumn::make('details')->label('Tafsilotlar')->wrap()
                    ->state(fn (PersonSuggestion $r) => collect($r->payload)->except('name')
                        ->map(fn ($v, $k) => ['gender' => 'Jinsi', 'birth_year' => 'Tugʻilgan', 'death_year' => 'Vafot', 'job' => 'Kasbi', 'bio' => 'Izoh'][$k].': '.$v)
                        ->implode(' · ')),
                TextColumn::make('where')->label('Shajaradagi oʻrni')->wrap()
                    ->state(fn (PersonSuggestion $r) => match (true) {
                        $r->type === 'edit' => null,
                        $r->parent && $r->relation === 'spouse' => $r->parent->name.'ning turmush oʻrtogʻi',
                        (bool) $r->parent => $r->parent->name.'ning farzandi',
                        $r->relation === 'root' => 'Yangi avlod boshi: '.($r->lineage ?: ($r->payload['name'] ?? '').' avlodi').($r->tribe ? " ({$r->tribe})" : ''),
                        default => $r->clan ? $r->clan->name.' avlodi boshi' : null,
                    })
                    ->placeholder('—'),
                TextColumn::make('person.name')->label('Tuzatiladigan')->placeholder('—'),
                TextColumn::make('comment')->label('Izoh')->limit(80)->wrap()->placeholder('—'),
                TextColumn::make('user.name')->label('Yuborgan'),
                TextColumn::make('status')->label('Holati')->badge()
                    ->formatStateUsing(fn ($state) => PersonSuggestion::STATUSES[$state] ?? $state)
                    ->color(fn ($state) => match ($state) {
                        'approved' => 'success', 'rejected' => 'danger', default => 'warning'
                    }),
            ])
            ->filters([
                SelectFilter::make('status')->label('Holati')->options(PersonSuggestion::STATUSES)->default('pending'),
            ])
            ->recordActions([
                Action::make('approve')->label('Tasdiqlash')->icon(Heroicon::OutlinedCheck)->color('success')
                    ->visible(fn (PersonSuggestion $r) => $r->status === 'pending')
                    ->requiresConfirmation()
                    ->modalDescription('Maʼlumot shajaraga qoʻshiladi yoki yangilanadi.')
                    ->action(function (PersonSuggestion $r) {
                        $person = $r->approve(auth()->user());
                        Notification::make()->success()->title("Shajaraga kiritildi: {$person->name}")->send();
                    }),
                Action::make('reject')->label('Rad etish')->icon(Heroicon::OutlinedXMark)->color('danger')
                    ->visible(fn (PersonSuggestion $r) => $r->status === 'pending')
                    ->requiresConfirmation()
                    ->action(fn (PersonSuggestion $r) => $r->reject(auth()->user())),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ManagePersonSuggestions::route('/')];
    }
}
