<?php

namespace Database\Seeders;

use App\Models\Channel;
use App\Models\Setting;
use Illuminate\Database\Seeder;

/** Sayt ishlashi uchun zarur boshlangʻich maʼlumotlar (namuna emas): chat kanallari va qishloq nomi. */
class EssentialsSeeder extends Seeder
{
    public const CHANNELS = [
        ['umumiy', 'Umumiy suhbat', 'hash', 'Barcha qishloqdoshlar uchun', false],
        ['elonlar', 'Eʼlonlar', 'megaphone', 'Faqat rasmiy eʼlonlar', true],
        ['marosim', 'Toʻy va marakalar', 'heart', 'Taklifnomalar va tabriklar', false],
        ['shajara', 'Shajara savollari', 'shajara', 'Qarindoshlarni birga izlaymiz', false],
        ['yoshlar', 'Yoshlar', 'star', 'Sport, taʼlim, ish', false],
    ];

    public function run(): void
    {
        foreach (self::CHANNELS as $i => [$slug, $name, $icon, $desc, $readonly]) {
            Channel::firstOrCreate(['slug' => $slug], [
                'name' => $name, 'icon' => $icon, 'description' => $desc, 'is_readonly' => $readonly, 'position' => $i,
            ]);
        }
        if (Setting::get('village_name') === null) {
            Setting::put('village_name', 'Zachkana');
        }
    }
}
