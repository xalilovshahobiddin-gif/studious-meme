<?php

namespace App\Support;

use App\Models\Announcement;
use App\Models\Clan;
use App\Models\HistoryChapter;
use App\Models\Person;
use App\Models\Setting;
use App\Models\TimelineEvent;
use App\Models\User;
use App\Models\Veteran;
use Illuminate\Support\Facades\DB;

/**
 * Oʻrnatishda yuklangan namuna maʼlumotlarni oʻchiradi. Faqat namunaga (database/seeders/data/sample.json)
 * aynan mos keladigan yozuvlar oʻchadi — admin qoʻshgan yoki oʻzgartirgan maʼlumotlarga tegmaydi.
 */
class SampleDataCleaner
{
    /** @return array<string, int> nechta yozuv oʻchirildi */
    public static function run(): array
    {
        $d = json_decode(file_get_contents(database_path('seeders/data/sample.json')), true);
        $n = ['people' => 0, 'clans' => 0, 'history' => 0, 'timeline' => 0, 'veterans' => 0, 'announcements' => 0, 'users' => 0];

        DB::transaction(function () use ($d, &$n) {
            foreach ($d['trees'] as $slug => $root) {
                $clan = Clan::where('slug', $slug)->first();
                if (! $clan) {
                    continue;
                }
                // Namunadagi odamlar (ism + tugʻilgan yil) — avval barglardan, keyin ildizga qarab
                $pairs = [];
                $walk = function (array $p) use (&$walk, &$pairs) {
                    foreach ($p['children'] ?? [] as $c) {
                        $walk($c);
                    }
                    if (isset($p['spouse'])) {
                        $pairs[] = [$p['spouse']['name'], $p['spouse']['b'] ?? null];
                    }
                    $pairs[] = [$p['name'], $p['b'] ?? null];
                };
                $walk($root);
                foreach ($pairs as [$name, $year]) {
                    $n['people'] += Person::where('clan_id', $clan->id)->where('name', $name)->where('birth_year', $year)->delete();
                }
                if ($clan->people()->doesntExist()) {
                    $clan->delete();
                    $n['clans']++;
                }
            }

            foreach ($d['history'] as $h) {
                $n['history'] += HistoryChapter::where('slug', $h['id'])->where('title', $h['title'])->delete();
            }
            foreach ($d['timeline'] as $t) {
                $n['timeline'] += TimelineEvent::where('title', $t['title'])->where('year_label', $t['year'])->delete();
            }
            foreach ($d['veterans'] as $v) {
                $n['veterans'] += Veteran::where('name', $v['name'])->where('title', $v['title'])->delete();
            }
            foreach ($d['news'] as $a) {
                $n['announcements'] += Announcement::where('title', $a['title'])->delete();
            }

            // Chatdagi namuna foydalanuvchilar (ular bilan birga xabarlari ham oʻchadi)
            $n['users'] = User::where('role', 'user')
                ->whereNull('google_id')->whereNull('telegram_id')
                ->where(fn ($q) => $q->where('username', 'like', 'namuna%')->orWhere('phone', 'like', '998000%'))
                ->get()->each->delete()->count();

            foreach (['population' => '4250', 'households' => '780', 'village_region' => $d['village']['region']] as $key => $sample) {
                if (Setting::get($key) === $sample) {
                    Setting::put($key, null);
                }
            }
        });

        return $n;
    }
}
