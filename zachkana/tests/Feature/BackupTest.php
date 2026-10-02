<?php

namespace Tests\Feature;

use App\Models\Clan;
use App\Models\Person;
use App\Models\Setting;
use App\Models\User;
use App\Support\Backup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;
use ZipArchive;

class BackupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->useStoragePath(sys_get_temp_dir().'/zk-backup-test-'.uniqid());
        File::ensureDirectoryExists(storage_path('app/public/people'));
        touch(storage_path('installed'));
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(storage_path());
        parent::tearDown();
    }

    public function test_backup_and_restore_roundtrip(): void
    {
        $clan = Clan::create(['slug' => 'mirzaboy', 'name' => 'Mirzaboylar']);
        $root = Person::create(['clan_id' => $clan->id, 'name' => 'Mirzaboy ota', 'gender' => 'm', 'bio' => "Qoʻshtirnoq ' va \"belgilar\"", 'photo' => 'people/ota.jpg']);
        Person::create(['clan_id' => $clan->id, 'parent_id' => $root->id, 'name' => 'Karim', 'gender' => 'm']);
        Setting::put('village_name', 'Zachkana');
        file_put_contents(storage_path('app/public/people/ota.jpg'), 'JPEGDATA');

        $name = Backup::create('manual');
        $zip = new ZipArchive;
        $zip->open(Backup::path($name));
        $this->assertSame(2, Backup::inspect(Backup::path($name))['tables']['people']);
        $this->assertSame('JPEGDATA', $zip->getFromName('files/people/ota.jpg'));
        $this->assertStringContainsString('INSERT INTO `people`', $zip->getFromName('database.sql'));
        $this->assertFalse($zip->locateName('db/sessions.jsonl'), 'vaqtinchalik jadvallar kirmaydi');
        $zip->close();

        // Maʼlumotlar buziladi…
        Person::query()->delete();
        Clan::create(['slug' => 'yangi', 'name' => 'Keyin qoʻshilgan']);
        Setting::put('village_name', 'Boshqa');
        unlink(storage_path('app/public/people/ota.jpg'));

        // …va tiklanadi
        $r = Backup::restore($name);
        $this->assertSame(1, $r['files']);
        $this->assertSame(['Mirzaboy ota', 'Karim'], Person::orderBy('id')->pluck('name')->all());
        $this->assertSame("Qoʻshtirnoq ' va \"belgilar\"", Person::first()->bio);
        $this->assertSame($root->id, Person::where('name', 'Karim')->value('parent_id'));
        $this->assertSame(['mirzaboy'], Clan::pluck('slug')->all());
        $this->assertSame('Zachkana', Setting::get('village_name'));
        $this->assertSame('JPEGDATA', file_get_contents(storage_path('app/public/people/ota.jpg')));
        // Tiklashdan oldingi holat alohida saqlangan
        $this->assertStringEndsWith('-restore.zip', $r['safety']);
        $this->assertSame(0, Backup::inspect(Backup::path($r['safety']))['tables']['people']);
    }

    public function test_only_zachkana_backups_are_accepted_and_paths_are_safe(): void
    {
        File::ensureDirectoryExists(Backup::dir());
        $bad = Backup::dir().'/boshqa.zip';
        $zip = new ZipArchive;
        $zip->open($bad, ZipArchive::CREATE);
        $zip->addFromString('hello.txt', 'x');
        $zip->close();

        // Katalogdan tashqaridagi fayl — topilmaydi
        try {
            Backup::path('../../.env');
            $this->fail('katalogdan chiqib ketdi');
        } catch (\RuntimeException $e) {
            $this->assertSame('Zaxira fayli topilmadi.', $e->getMessage());
        }

        $this->expectExceptionMessage('Zachkana zaxira fayli emas');
        Backup::restore('boshqa.zip');
    }

    public function test_auto_backup_runs_once_a_day_and_keeps_last_seven(): void
    {
        unlink(storage_path('installed'));
        $this->assertFalse(Backup::autoDue(), 'oʻrnatilmagan saytda ishlamaydi');
        touch(storage_path('installed'));

        $this->assertTrue(Backup::autoDue());
        Backup::runAuto();
        $this->assertFalse(Backup::autoDue(), 'bugun qayta ishlamaydi');
        $this->assertCount(1, Backup::all());

        Setting::put('backup_auto', '0');
        touch(Backup::dir().'/.last-auto', time() - 2 * 86400);
        $this->assertFalse(Backup::autoDue(), 'oʻchirilgan');

        Setting::put('backup_auto', '1');
        for ($i = 0; $i < 9; $i++) {
            $name = Backup::create('auto');
            touch(Backup::path($name), time() - 1000 + $i); // sanalar farqli boʻlsin
            rename(Backup::path($name), Backup::dir()."/zachkana-2026-01-0{$i}-000000-auto.zip");
        }
        Backup::prune();
        $this->assertCount(Backup::KEEP_AUTO, collect(Backup::all())->where('kind', 'auto'));
    }

    public function test_backups_page_is_admin_only(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'moderator']))->get('/admin/zaxira')->assertForbidden();
        Backup::create('manual');
        $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/admin/zaxira')->assertOk()
            ->assertSee('Hozir zaxira qilish')->assertSee('Qoʻlda');
    }
}
