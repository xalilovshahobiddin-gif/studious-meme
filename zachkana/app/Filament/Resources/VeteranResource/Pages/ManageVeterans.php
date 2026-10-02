<?php

namespace App\Filament\Resources\VeteranResource\Pages;

use App\Filament\Resources\VeteranResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ManageRecords;

class ManageVeterans extends ManageRecords
{
    protected static string $resource = VeteranResource::class;

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()];
    }
}
