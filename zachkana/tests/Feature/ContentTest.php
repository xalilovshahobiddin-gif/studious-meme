<?php

namespace Tests\Feature;

use App\Models\Memory;
use App\Models\Submission;
use App\Models\User;
use App\Models\Veteran;
use Database\Seeders\SampleDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_bootstrap_and_public_pages_with_sample_data(): void
    {
        $this->seed(SampleDataSeeder::class);

        $this->getJson('/api/bootstrap')->assertOk()
            ->assertJsonPath('village.name', 'Zachkana')
            ->assertJsonCount(3, 'clans')
            ->assertJsonPath('user', null)
            ->assertJsonPath('channels.0.last', null); // mehmonga xabarlar koʻrsatilmaydi

        $this->getJson('/api/history')->assertOk()->assertJsonPath('0.id', 'nom');
        $this->getJson('/api/timeline')->assertOk()->assertJsonPath('eras.0', 'Barchasi');
        $this->getJson('/api/veterans')->assertOk()->assertJsonCount(8, 'veterans');
        $this->getJson('/api/clans/mirzaboy/tree')->assertOk()->assertJsonPath('tree.name', 'Mirzaboy');
        $this->get('/')->assertOk();
    }

    public function test_memory_is_hidden_until_approved(): void
    {
        $v = Veteran::create(['name' => 'Ergash', 'category' => 'urush', 'title' => 'Askar']);
        $user = User::factory()->create(['name' => 'Oybek']);

        $this->actingAs($user)->postJson("/api/veterans/{$v->id}/memories", ['body' => 'Bobomning doʻsti edilar.'])
            ->assertCreated()->assertJsonPath('status', 'pending');
        $this->getJson("/api/veterans/{$v->id}")->assertJsonCount(0, 'memories');

        Memory::first()->update(['status' => 'approved']);
        $this->getJson("/api/veterans/{$v->id}")->assertJsonCount(1, 'memories')->assertJsonPath('memories.0.a', 'Oybek');
    }

    public function test_submission_with_attachment(): void
    {
        Storage::fake('public');
        $this->actingAs(User::factory()->create())->post('/api/submissions', [
            'type' => 'history', 'body' => 'Eski guzar surati', 'attachment' => UploadedFile::fake()->image('guzar.jpg'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->assertDatabaseHas('submissions', ['type' => 'history']);
        Storage::disk('public')->assertExists(Submission::first()->attachment);
    }

    public function test_submission_rejects_executable(): void
    {
        $this->actingAs(User::factory()->create())->post('/api/submissions', [
            'type' => 'history', 'body' => 'Fayl', 'attachment' => UploadedFile::fake()->create('virus.php', 10, 'application/x-php'),
        ], ['Accept' => 'application/json'])->assertJsonValidationErrors('attachment');
    }
}
