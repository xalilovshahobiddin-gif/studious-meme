<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Clan;
use App\Models\HistoryChapter;
use App\Models\Message;
use App\Models\Person;
use App\Models\User;
use App\Models\Veteran;
use App\Support\SampleDataCleaner;
use Database\Seeders\EssentialsSeeder;
use Database\Seeders\SampleDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SampleDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_essentials_seeder_creates_empty_channels_only(): void
    {
        $this->seed(EssentialsSeeder::class);

        $this->assertSame(5, Channel::count());
        $this->assertSame(0, Message::count());
        $this->assertSame(0, Clan::count() + Person::count() + Veteran::count() + HistoryChapter::count());
        $this->getJson('/api/bootstrap')->assertOk()->assertJsonCount(0, 'clans')->assertJsonPath('todayInHistory', null);
    }

    public function test_cleaner_removes_sample_but_keeps_real_data(): void
    {
        $this->seed(SampleDataSeeder::class);
        $mirzaboy = Clan::where('slug', 'mirzaboy')->first();
        // Admin qoʻshgan haqiqiy maʼlumotlar
        $real = Person::create(['clan_id' => $mirzaboy->id, 'name' => 'Haqiqiy Odam', 'gender' => 'm', 'birth_year' => 1950]);
        $realUser = User::factory()->create(['username' => 'shahobiddin']);
        Message::create(['channel_id' => Channel::first()->id, 'user_id' => $realUser->id, 'body' => 'Haqiqiy xabar']);
        Veteran::create(['name' => 'Haqiqiy Faxriy', 'category' => 'ustoz', 'title' => 'Oʻqituvchi']);

        $n = SampleDataCleaner::run();

        $this->assertGreaterThan(20, $n['people']);
        $this->assertSame(8, $n['veterans']);
        $this->assertTrue($real->fresh() !== null, 'haqiqiy odam qoldi');
        $this->assertNotNull(Clan::where('slug', 'mirzaboy')->first(), 'haqiqiy odam bor urugʻ oʻchmaydi');
        $this->assertNull(Clan::where('slug', 'qoraxon')->first());
        $this->assertSame(['Haqiqiy Faxriy'], Veteran::pluck('name')->all());
        $this->assertSame(['Haqiqiy xabar'], Message::pluck('body')->all());
        $this->assertSame(0, HistoryChapter::count());
        $this->assertNotNull($realUser->fresh());
    }
}
