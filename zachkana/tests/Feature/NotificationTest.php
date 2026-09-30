<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Clan;
use App\Models\Person;
use App\Models\PersonSuggestion;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_feed_has_links_and_read_state(): void
    {
        $user = User::factory()->create();
        $a = Announcement::create(['type' => 'elon', 'title' => 'Hashar', 'body' => 'Shanba kuni', 'published_at' => now()->subHour()]);
        Announcement::create(['type' => 'elon', 'title' => 'Qoralama', 'body' => '...', 'published_at' => null]);
        UserNotification::send($user->id, 'reply', 'Malika sizga javob berdi', 'Ha', '#/chat/umumiy/5');

        $this->actingAs($user)->getJson('/api/bootstrap')->assertJsonPath('unread', 2);
        $r = $this->actingAs($user)->getJson('/api/notifications')->assertOk()->assertJsonPath('unread', 2)->assertJsonCount(2, 'items');
        $this->assertEqualsCanonicalizing(['#/chat/umumiy/5', "#/elonlar/{$a->id}"], array_column($r->json('items'), 'url'));

        // Bittasini oʻqish
        $nid = collect($r->json('items'))->firstWhere('kind', 'reply')['id'];
        $this->actingAs($user)->postJson('/api/notifications/read', ['id' => $nid])->assertJsonPath('unread', 1);
        $this->actingAs($user)->getJson('/api/notifications/unread')->assertJsonPath('unread', 1);
        // Hammasini oʻqish
        $this->actingAs($user)->postJson('/api/notifications/read')->assertJsonPath('unread', 0);
    }

    public function test_announcement_pages(): void
    {
        $a = Announcement::create(['type' => 'marosim', 'title' => 'Toʻy', 'body' => "Birinchi\n\nIkkinchi", 'published_at' => now()]);
        $draft = Announcement::create(['type' => 'elon', 'title' => 'Qoralama', 'body' => '...', 'published_at' => now()->addDay()]);

        $this->getJson('/api/announcements')->assertOk()->assertJsonCount(1);
        $this->getJson("/api/announcements/{$a->id}")->assertOk()->assertJsonPath('body', "Birinchi\n\nIkkinchi");
        $this->getJson("/api/announcements/{$draft->id}")->assertNotFound();
    }

    public function test_suggestion_review_notifies_author(): void
    {
        $clan = Clan::create(['slug' => 'mirzaboy', 'name' => 'Mirzaboylar']);
        $root = Person::create(['clan_id' => $clan->id, 'name' => 'Mirzaboy', 'gender' => 'm']);
        $author = User::factory()->create();
        $admin = User::factory()->admin()->create();

        $s = PersonSuggestion::create(['user_id' => $author->id, 'type' => 'add', 'parent_id' => $root->id, 'payload' => ['name' => 'Karim', 'gender' => 'm'], 'status' => 'pending']);
        $s->approve($admin);
        $n = UserNotification::where('user_id', $author->id)->latest('id')->firstOrFail();
        $this->assertSame('Taklifingiz tasdiqlandi', $n->title);
        $this->assertSame('#/shajara/mirzaboy', $n->url);

        $s2 = PersonSuggestion::create(['user_id' => $author->id, 'type' => 'add', 'parent_id' => $root->id, 'payload' => ['name' => 'Xato'], 'status' => 'pending']);
        $s2->reject($admin);
        $this->assertSame('Taklifingiz qabul qilinmadi', UserNotification::latest('id')->first()->title);
    }
}
