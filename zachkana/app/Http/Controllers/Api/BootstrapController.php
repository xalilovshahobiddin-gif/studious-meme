<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Clan;
use App\Models\Person;
use App\Models\Setting;
use App\Models\TimelineEvent;
use App\Models\User;
use App\Models\Veteran;
use App\Support\Front;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Ilova ochilganda bir marta chaqiriladi: bosh sahifa va menyular uchun hamma narsa. */
class BootstrapController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $fmt = fn ($n) => number_format((int) $n, 0, '', "\u{202F}");
        $today = TimelineEvent::where('is_major', true)->inRandomOrder()->first() ?? TimelineEvent::inRandomOrder()->first();

        return response()->json([
            'village' => [
                'name' => Setting::get('village_name', 'Zachkana'),
                'region' => Setting::get('village_region', ''),
                'stats' => [
                    ['value' => $fmt(Setting::get('population', 0)), 'label' => 'Aholi', 'icon' => 'users'],
                    ['value' => $fmt(Setting::get('households', 0)), 'label' => 'Xonadon', 'icon' => 'home2'],
                    ['value' => $fmt(Person::count()), 'label' => 'Shajarada', 'icon' => 'shajara'],
                    ['value' => $fmt(Veteran::count()), 'label' => 'Faxriy', 'icon' => 'medal'],
                ],
            ],
            'news' => Announcement::published()->latest('published_at')->limit(5)->get()->map(Front::announcement(...)),
            'todayInHistory' => $today ? ['year' => $today->year_label, 'title' => $today->title, 'text' => $today->body] : null,
            'clans' => Clan::withCount('people')->orderBy('position')->get()
                ->map(fn (Clan $c) => ['id' => $c->slug, 'name' => $c->name, 'count' => $c->people_count]),
            'channels' => ChatController::channelList($request->user()),
            'user' => AuthController::present($request->user()),
            'members' => User::count(),
        ]);
    }
}
