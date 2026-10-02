<?php

namespace App\Filament\Resources\PersonSuggestionResource\Pages;

use App\Filament\Resources\PersonSuggestionResource;
use Filament\Resources\Pages\ManageRecords;

class ManagePersonSuggestions extends ManageRecords
{
    protected static string $resource = PersonSuggestionResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
