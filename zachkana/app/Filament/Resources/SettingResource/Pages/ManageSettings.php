<?php

namespace App\Filament\Resources\SettingResource\Pages;

use App\Filament\Resources\SettingResource;
use App\Support\SampleDataCleaner;
use Filament\Actions\Action;
use Filament\Actions\CreateAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ManageRecords;
use Filament\Support\Icons\Heroicon;

class ManageSettings extends ManageRecords
{
    protected static string $resource = SettingResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('removeSample')
                ->label('Namuna maʼlumotlarni oʻchirish')
                ->icon(Heroicon::OutlinedTrash)
                ->color('danger')
                ->visible(fn () => auth()->user()?->isAdmin())
                ->requiresConfirmation()
                ->modalHeading('Namuna maʼlumotlarni oʻchirish')
                ->modalDescription('Oʻrnatishda yuklangan toʻqilgan maʼlumotlar (Mirzaboylar avlodi, namuna tarix, faxriylar, eʼlonlar va chatdagi namuna xabarlar) oʻchiriladi. Siz qoʻshgan yoki oʻzgartirgan maʼlumotlarga tegilmaydi.')
                ->modalSubmitActionLabel('Ha, oʻchirish')
                ->action(function () {
                    $n = SampleDataCleaner::run();
                    Notification::make()->success()->title('Namuna maʼlumotlar oʻchirildi')
                        ->body("Shajara: {$n['people']} kishi, {$n['clans']} avlod · tarix: {$n['history']} · xronologiya: {$n['timeline']} · faxriylar: {$n['veterans']} · eʼlonlar: {$n['announcements']} · chat foydalanuvchilari: {$n['users']}")
                        ->send();
                }),
            CreateAction::make(),
        ];
    }
}
