<?php

namespace Tests\Feature;

use App\Support\SchemaUpdater;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class SchemaUpdaterTest extends TestCase
{
    use RefreshDatabase;

    private string $installed;

    protected function setUp(): void
    {
        parent::setUp();
        $this->installed = storage_path('installed');
        @unlink(SchemaUpdater::markerPath());
    }

    protected function tearDown(): void
    {
        @unlink($this->installed);
        @unlink(SchemaUpdater::markerPath());
        parent::tearDown();
    }

    public function test_does_nothing_before_installation(): void
    {
        Artisan::spy();
        SchemaUpdater::ensure();
        Artisan::shouldNotHaveReceived('call');
    }

    public function test_migrates_once_after_new_files_are_uploaded(): void
    {
        touch($this->installed);
        Artisan::shouldReceive('call')->once()->with('migrate', ['--force' => true])->andReturn(0);

        SchemaUpdater::ensure();
        SchemaUpdater::ensure(); // ikkinchi marta — marker bor, qayta ishlamaydi

        $this->assertSame(SchemaUpdater::latestMigration(), file_get_contents(SchemaUpdater::markerPath()));
    }
}
