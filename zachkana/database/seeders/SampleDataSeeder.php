<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Channel;
use App\Models\Clan;
use App\Models\HistoryChapter;
use App\Models\Memory;
use App\Models\Message;
use App\Models\Person;
use App\Models\Setting;
use App\Models\TimelineEvent;
use App\Models\User;
use App\Models\Veteran;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Namuna maʼlumotlar (data/sample.json = public/js/data.js bilan bir xil).
 * Hammasi toʻqilgan — haqiqiy maʼlumotlar admin paneldan kiritiladi.
 */
class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        $d = json_decode(file_get_contents(__DIR__.'/data/sample.json'), true);

        DB::transaction(function () use ($d) {
            Setting::put('village_name', $d['village']['name']);
            Setting::put('village_region', $d['village']['region']);
            Setting::put('population', '4250');
            Setting::put('households', '780');

            foreach ($d['clans'] as $i => $c) {
                $clan = Clan::updateOrCreate(['slug' => $c['id']], ['name' => $c['name'], 'position' => $i]);
                if ($clan->people()->doesntExist() && isset($d['trees'][$c['id']])) {
                    $this->person($clan, $d['trees'][$c['id']]);
                }
            }

            foreach ($d['history'] as $i => $h) {
                HistoryChapter::updateOrCreate(['slug' => $h['id']], [
                    'title' => $h['title'],
                    'body' => implode("\n\n", $h['paras']),
                    'quote_text' => $h['quote']['text'] ?? null,
                    'quote_cite' => $h['quote']['cite'] ?? null,
                    'position' => $i,
                ]);
            }

            if (TimelineEvent::doesntExist()) {
                foreach ($d['timeline'] as $i => $t) {
                    TimelineEvent::create([
                        'era' => $t['era'], 'year_label' => $t['year'],
                        'sort_year' => preg_match('/\d{3,4}/', $t['year'], $m) ? (int) $m[0] : null,
                        'title' => $t['title'], 'body' => $t['text'], 'icon' => $t['icon'],
                        'is_major' => $t['major'] ?? false, 'position' => $i,
                    ]);
                }
            }

            if (Veteran::doesntExist()) {
                foreach ($d['veterans'] as $i => $v) {
                    $veteran = Veteran::create([
                        'name' => $v['name'], 'category' => $v['cat'], 'title' => $v['title'],
                        'birth_year' => $v['b'], 'death_year' => $v['d'] ?? null, 'medals' => $v['medals'],
                        'short' => $v['short'], 'quote' => $v['quote'], 'position' => $i,
                    ]);
                    if ($i < 3) {
                        Memory::create(['veteran_id' => $veteran->id, 'author_name' => 'Latofat Umarova', 'status' => 'approved',
                            'body' => 'Bolaligimizda u kishining hikoyalarini tinglab oʻsganmiz. Xotirasi yodimizda.']);
                    }
                }
            }

            if (Announcement::doesntExist()) {
                foreach ($d['news'] as $i => $n) {
                    Announcement::create([
                        'type' => ['Eʼlon' => 'elon', 'Yangilik' => 'yangilik', 'Marosim' => 'marosim'][$n['type']] ?? 'yangilik',
                        'title' => $n['title'], 'body' => $n['text'], 'published_at' => now()->subDays(2 + $i * 3),
                    ]);
                }
            }

            foreach ($d['channels'] as $i => $c) {
                $channel = Channel::updateOrCreate(['slug' => $c['id']], [
                    'name' => $c['name'], 'icon' => $c['icon'], 'description' => $c['desc'],
                    'is_readonly' => $c['readonly'] ?? false, 'position' => $i,
                ]);
                if ($channel->messages()->doesntExist()) {
                    foreach ($d['messages'][$c['id']] ?? [] as $j => $m) {
                        if (! empty($m['me'])) {
                            continue;
                        }
                        Message::create([
                            'channel_id' => $channel->id,
                            'user_id' => $this->sampleUser($m['a'])->id,
                            'body' => $m['text'],
                        ])->forceFill(['created_at' => now()->subMinutes(60 - $j * 5)])->save();
                    }
                }
            }
        });
    }

    private function person(Clan $clan, array $n, ?Person $parent = null, int $pos = 0): void
    {
        $p = Person::create([
            'clan_id' => $clan->id, 'parent_id' => $parent?->id, 'name' => $n['name'], 'gender' => $n['g'],
            'birth_year' => $n['b'] ?? null, 'death_year' => $n['d'] ?? null,
            'job' => $n['job'] ?? null, 'bio' => $n['bio'] ?? null, 'position' => $pos,
        ]);
        if (isset($n['spouse'])) {
            $s = $n['spouse'];
            Person::create([
                'clan_id' => $clan->id, 'spouse_id' => $p->id, 'name' => $s['name'], 'gender' => $s['g'],
                'birth_year' => $s['b'] ?? null, 'death_year' => $s['d'] ?? null,
            ]);
        }
        foreach ($n['children'] ?? [] as $i => $child) {
            $this->person($clan, $child, $p, $i);
        }
    }

    /** Chat namunalari uchun foydalanuvchilar (kira olmaydi: parol tasodifiy). */
    private function sampleUser(string $name): User
    {
        return User::firstOrCreate(
            ['username' => 'namuna'.str_pad((string) (abs(crc32($name)) % 1000000), 6, '0', STR_PAD_LEFT)],
            ['name' => $name, 'password' => Str::random(40), 'role' => 'user'],
        );
    }
}
