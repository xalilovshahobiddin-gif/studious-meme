<?php

namespace Tests\Feature;

use App\Models\FamilyMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FamilyTreeTest extends TestCase
{
    use RefreshDatabase;

    private function add(array $data): string
    {
        return $this->postJson('/api/family', $data + ['gender' => 'm'])->assertCreated()->json('member.id');
    }

    public function test_build_family_tree(): void
    {
        $this->actingAs(User::factory()->create());

        $me = $this->add(['relation' => 'root', 'name' => 'Sardor', 'birth_year' => 1990, 'is_me' => true]);
        $father = $this->add(['relation' => 'parent', 'of' => $me, 'name' => 'Rustam', 'birth_year' => 1960]);
        $mother = $this->add(['relation' => 'spouse', 'of' => $father, 'name' => 'Gulnora', 'gender' => 'f']);
        $wife = $this->add(['relation' => 'spouse', 'of' => $me, 'name' => 'Madina', 'gender' => 'f']);
        // Kelinga farzand qoʻshilsa — farzand asosiy aʼzoga (Sardorga) bogʻlanadi
        $son = $this->add(['relation' => 'child', 'of' => $wife, 'name' => 'Ali', 'birth_year' => 2020]);

        $m = collect($this->getJson('/api/family')->assertOk()->json('members'))->keyBy('id');
        $this->assertSame($father, $m[$me]['parent']);
        $this->assertSame($father, $m[$mother]['spouseOf']);
        $this->assertSame($me, $m[$wife]['spouseOf']);
        $this->assertSame($me, $m[$son]['parent']);
        $this->assertTrue($m[$me]['me']);

        // Ota-onasi bor odamga yana ota-ona qoʻshib boʻlmaydi
        $this->postJson('/api/family', ['relation' => 'parent', 'of' => $me, 'name' => 'X', 'gender' => 'm'])->assertJsonValidationErrors('of');
        // Kelin-kuyovga turmush oʻrtogʻi qoʻshib boʻlmaydi
        $this->postJson('/api/family', ['relation' => 'spouse', 'of' => $wife, 'name' => 'Y', 'gender' => 'm'])->assertJsonValidationErrors('of');
    }

    public function test_update_me_flag_and_delete(): void
    {
        $this->actingAs(User::factory()->create());
        $a = $this->add(['relation' => 'root', 'name' => 'A', 'is_me' => true]);
        $b = $this->add(['relation' => 'child', 'of' => $a, 'name' => 'B']);
        $c = $this->add(['relation' => 'spouse', 'of' => $a, 'name' => 'C', 'gender' => 'f']);

        $this->patchJson("/api/family/$b", ['name' => 'Bobur', 'gender' => 'm', 'is_me' => true])->assertJsonPath('member.me', true);
        $this->assertFalse(FamilyMember::find($a)->is_me);

        $this->deleteJson("/api/family/$a")->assertOk();
        $this->assertNull(FamilyMember::find($c), 'turmush oʻrtogʻi ham oʻchadi');
        $this->assertNull(FamilyMember::find($b)->parent_id, 'farzand alohida shox boʻlib qoladi');
    }

    public function test_family_tree_is_private(): void
    {
        $owner = User::factory()->create();
        $member = FamilyMember::create(['user_id' => $owner->id, 'name' => 'Maxfiy', 'gender' => 'm']);

        $this->getJson('/api/family')->assertUnauthorized();
        $this->actingAs(User::factory()->create());
        $this->getJson('/api/family')->assertJsonCount(0, 'members');
        $this->patchJson("/api/family/{$member->id}", ['name' => 'X', 'gender' => 'm'])->assertNotFound();
        $this->deleteJson("/api/family/{$member->id}")->assertNotFound();
        $this->postJson('/api/family', ['relation' => 'child', 'of' => $member->id, 'name' => 'X', 'gender' => 'm'])->assertNotFound();
    }

    public function test_photo_upload_replace_and_cleanup(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $this->actingAs($user);
        $id = $this->add(['name' => 'Dilnoza', 'relation' => 'root', 'is_me' => true, 'gender' => 'f']);
        $spouse = $this->add(['name' => 'Jamshid', 'relation' => 'spouse', 'of' => $id]);

        $url = $this->post("/api/family/$id/photo", ['photo' => UploadedFile::fake()->image('a.jpg', 400, 400)], ['Accept' => 'application/json'])
            ->assertOk()->json('member.photo');
        $first = FamilyMember::find($id)->photo;
        $this->assertStringContainsString($first, $url);
        Storage::disk('public')->assertExists($first);

        // Almashtirilganda eskisi oʻchadi
        $this->post("/api/family/$id/photo", ['photo' => UploadedFile::fake()->image('b.jpg')], ['Accept' => 'application/json'])->assertOk();
        Storage::disk('public')->assertMissing($first);

        // Surat boʻlmagan fayl rad etiladi, begona aʼzo — 404
        $this->post("/api/family/$id/photo", ['photo' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->actingAs(User::factory()->create())->post("/api/family/$id/photo", [], ['Accept' => 'application/json'])->assertNotFound();

        // Aʼzo oʻchirilganda (turmush oʻrtogʻi bilan) suratlar ham oʻchadi
        $this->actingAs($user)->post("/api/family/$spouse/photo", ['photo' => UploadedFile::fake()->image('c.jpg')], ['Accept' => 'application/json']);
        $files = FamilyMember::whereIn('id', [$id, $spouse])->pluck('photo')->all();
        $this->deleteJson("/api/family/$id")->assertOk();
        foreach ($files as $f) {
            Storage::disk('public')->assertMissing($f);
        }
    }
}
