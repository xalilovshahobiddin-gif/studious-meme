<?php

namespace App\Filament\Resources\MemoryResource\Pages;

use App\Filament\Resources\MemoryResource;
use Filament\Resources\Pages\ManageRecords;

class ManageMemories extends ManageRecords
{
    protected static string $resource = MemoryResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
