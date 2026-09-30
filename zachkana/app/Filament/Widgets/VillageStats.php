<?php

namespace App\Filament\Widgets;

use App\Models\Memory;
use App\Models\Message;
use App\Models\Person;
use App\Models\PersonSuggestion;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class VillageStats extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        $pending = PersonSuggestion::where('status', 'pending')->count() + Memory::where('status', 'pending')->count();

        return [
            Stat::make('Shajarada', Person::count())->description('kishi'),
            Stat::make('Foydalanuvchilar', User::count())->description('roʻyxatdan oʻtgan'),
            Stat::make('Bugungi xabarlar', Message::whereDate('created_at', today())->count())->description('chatda'),
            Stat::make('Moderatsiya kutmoqda', $pending)->color($pending ? 'warning' : 'success')->description('takliflar va xotiralar'),
        ];
    }
}
