<?php

namespace App\Filament\Resources\HistoryChapterResource\Pages;

use App\Filament\Resources\HistoryChapterResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ManageRecords;

class ManageHistoryChapters extends ManageRecords
{
    protected static string $resource = HistoryChapterResource::class;

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()];
    }
}
