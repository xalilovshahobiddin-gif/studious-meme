<?php

namespace Tests\Feature;

use App\Models\Clan;
use App\Models\Person;
use App\Models\PersonSuggestion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShajaraTest extends TestCase
{
    use RefreshDatabase;

    private function family(): array
    {
        $clan = Clan::create(['slug' => 'mirzaboy', 'name' => 'Mirzaboylar']);
        $root = Person::create(['clan_id' => $clan->id, 'name' => 'Mirzaboy', 'gender' => 'm', 'birth_year' => 1868, 'death_year' => 1941]);
        Person::create(['clan_id' => $clan->id, 'spouse_id' => $root->id, 'name' => 'Oysha', 'gender' => 'f']);
        $son = Person::create(['clan_id' => $clan->id, 'parent_id' => $root->id, 'name' => 'Karimberdi', 'gender' => 'm', 'birth_year' => 1895]);
        Person::create(['clan_id' => $clan->id, 'parent_id' => $root->id, 'name' => 'Hoshimjon', 'gender' => 'm', 'birth_year' => 1906]);

        return [$clan, $root, $son];
    }

    public function test_tree_is_nested_with_spouse_and_children(): void
    {
        [, , $son] = $this->family();
        $user = User::factory()->create();
        $son->update(['user_id' => $user->id]);

        $this->actingAs($user)->getJson('/api/clans/mirzaboy/tree')
            ->assertOk()
            ->assertJsonPath('clan.count', 4)
            ->assertJsonPath('tree.name', 'Mirzaboy')
            ->assertJsonPath('tree.spouse.name', 'Oysha')
            ->assertJsonPath('tree.children.0.name', 'Karimberdi')
            ->assertJsonPath('tree.children.0.me', true)
            ->assertJsonPath('tree.children.1.name', 'Hoshimjon')
            ->assertJsonMissingPath('tree.children.1.me');
    }

    public function test_guest_cannot_suggest(): void
    {
        $this->family();
        $this->postJson('/api/people/suggestions', ['type' => 'add', 'name' => 'X'])->assertUnauthorized();
    }

    public function test_add_suggestion_is_pending_until_approved(): void
    {
        [, , $son] = $this->family();
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/people/suggestions', [
            'type' => 'add', 'name' => 'Abdulla', 'gender' => 'm', 'birth_year' => 1921, 'parent_id' => $son->id,
        ])->assertCreated()->assertJsonPath('status', 'pending');

        $this->assertDatabaseMissing('people', ['name' => 'Abdulla']);

        $suggestion = PersonSuggestion::firstOrFail();
        $person = $suggestion->approve(User::factory()->admin()->create());

        $this->assertSame($son->id, $person->parent_id);
        $this->assertSame($son->clan_id, $person->clan_id);
        $this->assertSame('approved', $suggestion->fresh()->status);
    }

    public function test_edit_suggestion_updates_person_on_approval(): void
    {
        [, $root] = $this->family();
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/people/suggestions', [
            'type' => 'edit', 'person_id' => $root->id, 'name' => 'Mirzaboy bobo', 'birth_year' => 1866, 'comment' => 'Hujjatdan',
        ])->assertCreated();

        PersonSuggestion::firstOrFail()->approve(User::factory()->admin()->create());
        $this->assertSame('Mirzaboy bobo', $root->fresh()->name);
        $this->assertSame(1866, $root->fresh()->birth_year);
    }

    public function test_death_year_cannot_precede_birth_year(): void
    {
        $this->family();
        $this->actingAs(User::factory()->create())->postJson('/api/people/suggestions', [
            'type' => 'add', 'clan' => 'mirzaboy', 'name' => 'Xato', 'birth_year' => 1950, 'death_year' => 1940,
        ])->assertJsonValidationErrors('death_year');
    }
}
