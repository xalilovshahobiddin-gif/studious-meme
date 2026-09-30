<?php

namespace Tests\Feature;

use App\Models\Clan;
use App\Models\Person;
use App\Models\PersonSuggestion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Avlodni bilmasdan qarindosh orqali qoʻshish, yangi avlod boshlash, urugʻ belgisi. */
class LineageTest extends TestCase
{
    use RefreshDatabase;

    private Clan $clan;

    private Person $rustam;

    private Person $gulnora;

    protected function setUp(): void
    {
        parent::setUp();
        $this->clan = Clan::create(['slug' => 'abdullayevlar', 'name' => 'Abdullayevlar', 'tribe' => 'Qovchin']);
        $root = Person::create(['clan_id' => $this->clan->id, 'name' => 'Abdulla Karimov', 'gender' => 'm', 'birth_year' => 1920]);
        $this->rustam = Person::create(['clan_id' => $this->clan->id, 'parent_id' => $root->id, 'name' => 'Rustam Abdullayev', 'gender' => 'm', 'birth_year' => 1950]);
        $this->gulnora = Person::create(['clan_id' => $this->clan->id, 'spouse_id' => $this->rustam->id, 'name' => 'Gulnora Saidova', 'gender' => 'f']);
        Person::create(['clan_id' => $this->clan->id, 'parent_id' => $root->id, 'name' => 'Shoʻxrat Abdullayev', 'gender' => 'm']);
    }

    private function approveLast(): Person
    {
        return PersonSuggestion::latest('id')->first()->approve(User::factory()->create(['role' => 'moderator']));
    }

    public function test_search_whole_village_ignoring_apostrophe_kind(): void
    {
        $this->getJson('/api/people/search?q=rustam')->assertOk()
            ->assertJsonPath('people.0.name', 'Rustam Abdullayev')
            ->assertJsonPath('people.0.clan', 'abdullayevlar')
            ->assertJsonPath('people.0.tribe', 'Qovchin')
            ->assertJsonPath('people.0.rel', 'Abdulla Karimovning oʻgʻli');
        $this->getJson('/api/people/search?q=gulnora')->assertJsonPath('people.0.isSpouse', true)
            ->assertJsonPath('people.0.rel', 'Rustam Abdullayevning turmush oʻrtogʻi');
        // Oddiy apostrof bilan yozilsa ham topiladi
        $this->getJson("/api/people/search?q=sho'xrat")->assertJsonCount(1, 'people');
        $this->getJson('/api/people/search?q=a')->assertJsonCount(0, 'people');
        $this->getJson('/api/bootstrap')->assertJsonPath('clans.0.tribe', 'Qovchin');
    }

    public function test_child_of_spouse_goes_to_blood_relative_and_spouse_suggestion(): void
    {
        $u = User::factory()->create();
        // Onasi (kelin) tanlangan — farzand otasiga bogʻlanadi
        $this->actingAs($u)->postJson('/api/people/suggestions', ['type' => 'add', 'relation' => 'child', 'parent_id' => $this->gulnora->id, 'name' => 'Dilnoza', 'gender' => 'f'])->assertCreated();
        $d = $this->approveLast();
        $this->assertSame($this->rustam->id, $d->parent_id);
        $this->assertSame($this->clan->id, $d->clan_id);

        $this->actingAs($u)->postJson('/api/people/suggestions', ['type' => 'add', 'relation' => 'spouse', 'parent_id' => $d->id, 'name' => 'Jamshid', 'gender' => 'm'])->assertCreated();
        $j = $this->approveLast();
        $this->assertSame($d->id, $j->spouse_id);
        $this->assertNull($j->parent_id);

        // Turmush oʻrtogʻiga yana turmush oʻrtogʻi qoʻshib boʻlmaydi
        $this->actingAs($u)->postJson('/api/people/suggestions', ['type' => 'add', 'relation' => 'spouse', 'parent_id' => $this->gulnora->id, 'name' => 'X'])
            ->assertUnprocessable()->assertJsonValidationErrors('parent_id');
        // Qarindoshi tanlanmagan farzand — rad
        $this->actingAs($u)->postJson('/api/people/suggestions', ['type' => 'add', 'relation' => 'child', 'name' => 'Y'])->assertJsonValidationErrors('parent_id');
    }

    public function test_new_lineage_creates_clan_with_tribe_on_approval(): void
    {
        $u = User::factory()->create();
        $this->actingAs($u)->postJson('/api/people/suggestions', ['type' => 'add', 'relation' => 'root', 'name' => 'Karimberdi ota', 'gender' => 'm', 'birth_year' => 1880, 'tribe' => 'Barlos'])->assertCreated();
        $this->assertSame(1, Clan::count(), 'tasdiqlanmaguncha avlod yaratilmaydi');

        $p = $this->approveLast();
        $clan = $p->clan;
        $this->assertSame('Karimberdi ota avlodi', $clan->name);
        $this->assertSame('karimberdi-ota-avlodi', $clan->slug);
        $this->assertSame('Barlos', $clan->tribe);
        $this->assertTrue($clan->founder()->is($p));
        $this->assertSame($clan->id, PersonSuggestion::latest('id')->first()->clan_id);

        // Nom berilgan va takrorlangan slug
        $this->actingAs($u)->postJson('/api/people/suggestions', ['type' => 'add', 'relation' => 'root', 'name' => 'Boshqa', 'lineage' => 'Karimberdi ota avlodi'])->assertCreated();
        $this->assertSame('karimberdi-ota-avlodi-2', $this->approveLast()->clan->slug);
    }
}
