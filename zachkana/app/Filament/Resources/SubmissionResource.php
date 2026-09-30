<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SubmissionResource\Pages\ManageSubmissions;
use App\Models\Submission;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;
use UnitEnum;

/** Qishloqdoshlar yuborgan tarix materiallari va faxriy takliflari. */
class SubmissionResource extends Resource
{
    protected static ?string $model = Submission::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedPaperClip;

    protected static string|UnitEnum|null $navigationGroup = 'Qishloq';

    protected static ?int $navigationSort = 6;

    protected static ?string $modelLabel = 'material';

    protected static ?string $pluralModelLabel = 'Yuborilgan materiallar';

    // Oʻzbekcha nomlar katta harfga oʻzgartirilmasin (\"Eʼlonlar Va Yangiliklar\" emas)
    protected static bool $hasTitleCaseModelLabel = false;

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getNavigationBadge(): ?string
    {
        $n = Submission::where('status', 'pending')->count();

        return $n ? (string) $n : null;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('id', 'desc')
            ->columns([
                TextColumn::make('created_at')->label('Sana')->dateTime('d.m.Y H:i'),
                TextColumn::make('type')->label('Turi')->badge()->formatStateUsing(fn ($state) => Submission::TYPES[$state] ?? $state),
                TextColumn::make('author_name')->label('Muallif')->placeholder(fn ($record) => $record->user?->name),
                TextColumn::make('subject')->label('Mavzu / faxriy')->placeholder('—'),
                TextColumn::make('body')->label('Matn')->wrap()->limit(200),
                TextColumn::make('attachment')->label('Fayl')
                    ->formatStateUsing(fn () => 'Ochish')
                    ->url(fn (Submission $s) => $s->attachment ? Storage::disk('public')->url($s->attachment) : null, true)
                    ->placeholder('—'),
                TextColumn::make('status')->label('Holati')->badge()
                    ->formatStateUsing(fn ($state) => Submission::STATUSES[$state] ?? $state)
                    ->color(fn ($state) => $state === 'reviewed' ? 'success' : 'warning'),
            ])
            ->filters([SelectFilter::make('status')->label('Holati')->options(Submission::STATUSES)])
            ->recordActions([
                Action::make('reviewed')->label('Koʻrib chiqildi')->icon(Heroicon::OutlinedCheck)
                    ->visible(fn (Submission $s) => $s->status === 'pending')
                    ->action(fn (Submission $s) => $s->update(['status' => 'reviewed'])),
                DeleteAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ManageSubmissions::route('/')];
    }
}
