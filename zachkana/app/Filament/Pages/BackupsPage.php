<?php

namespace App\Filament\Pages;

use App\Models\Setting;
use App\Support\Backup;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\FileUpload;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\EmbeddedTable;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Text;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Table;
use Illuminate\Support\Number;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;
use UnitEnum;

/** Zaxira nusxalar: yaratish, yuklab olish, tiklash, boshqa saytdan koʻchirish. Faqat administrator. */
class BackupsPage extends Page implements HasTable
{
    use InteractsWithTable;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedArchiveBox;

    protected static string|UnitEnum|null $navigationGroup = 'Tizim';

    protected static ?int $navigationSort = 4;

    protected static ?string $navigationLabel = 'Zaxira nusxalar';

    protected static ?string $title = 'Zaxira nusxalar';

    protected static ?string $slug = 'zaxira';

    public static function canAccess(): bool
    {
        return auth()->user()?->isAdmin() ?? false;
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('create')
                ->label('Hozir zaxira qilish')
                ->icon(Heroicon::OutlinedArrowDownTray)
                ->disabled(! Backup::available())
                ->action(function () {
                    try {
                        $name = Backup::create('manual');
                        Notification::make()->success()->title('Zaxira yaratildi')->body($name)->send();
                    } catch (Throwable $e) {
                        Notification::make()->danger()->title('Zaxira yaratilmadi')->body($e->getMessage())->send();
                    }
                }),
            Action::make('upload')
                ->label('Zaxira faylini yuklash')
                ->icon(Heroicon::OutlinedArrowUpTray)
                ->color('gray')
                ->modalDescription('Boshqa saytdan yoki kompyuteringizdan Zachkana zaxira faylini (.zip) yuklang. Keyin roʻyxatdan "Tiklash"ni bosasiz.')
                ->schema([
                    FileUpload::make('file')->label('Zaxira fayli (.zip)')->required()
                        ->acceptedFileTypes(['application/zip', 'application/x-zip-compressed', 'application/octet-stream'])
                        ->storeFiles(false)->maxSize(512 * 1024),
                ])
                ->action(function (array $data) {
                    /** @var TemporaryUploadedFile $file */
                    $file = $data['file'];
                    try {
                        $name = Backup::import($file->getRealPath());
                        Notification::make()->success()->title('Zaxira yuklandi')->body($name)->send();
                    } catch (Throwable $e) {
                        Notification::make()->danger()->title('Yuklab boʻlmadi')->body($e->getMessage())->send();
                    }
                }),
            Action::make('auto')
                ->label(fn () => Backup::autoEnabled() ? 'Avtomatik zaxira: yoqilgan' : 'Avtomatik zaxira: oʻchirilgan')
                ->icon(fn () => Backup::autoEnabled() ? Heroicon::OutlinedCheckCircle : Heroicon::OutlinedPauseCircle)
                ->color(fn () => Backup::autoEnabled() ? 'success' : 'gray')
                ->requiresConfirmation()
                ->modalHeading(fn () => Backup::autoEnabled() ? 'Avtomatik zaxirani oʻchirasizmi?' : 'Avtomatik zaxirani yoqasizmi?')
                ->modalDescription('Yoqilganda sayt har kuni bir marta oʻzi zaxira qiladi va oxirgi '.Backup::KEEP_AUTO.' tasini saqlaydi.')
                ->action(fn () => Setting::put('backup_auto', Backup::autoEnabled() ? '0' : '1')),
        ];
    }

    public function content(Schema $schema): Schema
    {
        $last = Backup::lastAuto();

        return $schema->components([
            Section::make()->schema([
                Text::make(Backup::available()
                    ? 'Zaxira nusxada saytning butun bazasi (shajara, tarix, faxriylar, chat, foydalanuvchilar, sozlamalar) va yuklangan suratlar bor. '
                        .'Zaxiralarni vaqti-vaqti bilan kompyuteringizga yuklab oling — hosting buzilsa ham maʼlumot saqlanib qoladi.'
                    : 'Serverda PHP zip kengaytmasi yoʻq — hosting panelida (ISPmanager → PHP → kengaytmalar) "zip" ni yoqing.'),
                Text::make(Backup::autoEnabled()
                    ? 'Oxirgi avtomatik zaxira: '.($last ? date('d.m.Y H:i', $last) : 'hali boʻlmagan (saytga birinchi kirishda yaratiladi)')
                    : 'Avtomatik zaxira oʻchirilgan.')->color('gray'),
            ]),
            EmbeddedTable::make(),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->records(fn (): array => collect(Backup::all())
                ->map(fn ($b) => $b + ['key' => $b['name']])
                ->keyBy('key')->all())
            ->columns([
                TextColumn::make('date')->label('Sana')
                    ->formatStateUsing(fn ($state) => date('d.m.Y H:i', $state)),
                TextColumn::make('kind')->label('Turi')->badge()
                    ->formatStateUsing(fn ($state) => ['manual' => 'Qoʻlda', 'auto' => 'Avtomatik', 'restore' => 'Tiklashdan oldin', 'upload' => 'Yuklangan'][$state] ?? $state)
                    ->color(fn ($state) => ['auto' => 'gray', 'restore' => 'warning', 'upload' => 'info'][$state] ?? 'success'),
                TextColumn::make('size')->label('Hajmi')->formatStateUsing(fn ($state) => Number::fileSize($state, 1)),
                TextColumn::make('name')->label('Fayl')->color('gray')->size('sm')->visibleFrom('2xl'),
            ])
            ->recordActions([
                Action::make('download')->label('Yuklab olish')->icon(Heroicon::OutlinedArrowDownTray)
                    ->action(fn (array $record): BinaryFileResponse => response()->download(Backup::path($record['name']))),
                Action::make('restore')->label('Tiklash')->icon(Heroicon::OutlinedArrowPath)->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading('Zaxiradan tiklansinmi?')
                    ->modalDescription(fn (array $record) => 'Saytdagi hozirgi maʼlumotlar '.date('d.m.Y H:i', $record['date'])
                        .' holatiga qaytariladi. Undan keyin qoʻshilganlar yoʻqoladi. Xavfsizlik uchun hozirgi holat avval alohida zaxiraga saqlanadi.')
                    ->modalSubmitActionLabel('Ha, tiklash')
                    ->action(function (array $record) {
                        try {
                            $r = Backup::restore($record['name']);
                            Notification::make()->success()->title('Tiklandi')
                                ->body("{$r['rows']} ta yozuv, {$r['files']} ta fayl. Oldingi holat: {$r['safety']}")->persistent()->send();
                        } catch (Throwable $e) {
                            Notification::make()->danger()->title('Tiklab boʻlmadi')->body($e->getMessage())->persistent()->send();
                        }
                    }),
                Action::make('delete')->label('Oʻchirish')->icon(Heroicon::OutlinedTrash)->color('danger')
                    ->requiresConfirmation()->modalHeading('Zaxira fayli oʻchirilsinmi?')
                    ->action(fn (array $record) => Backup::delete($record['name'])),
            ])
            ->emptyStateHeading('Hali zaxira yoʻq')
            ->emptyStateDescription('"Hozir zaxira qilish" tugmasini bosing.')
            ->paginated(false);
    }
}
