<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Message;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatActionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_reply_links_messages_and_notifies_author(): void
    {
        $ch = Channel::create(['slug' => 'umumiy', 'name' => 'Umumiy']);
        $jasur = User::factory()->create(['name' => 'Jasur']);
        $malika = User::factory()->create(['name' => 'Malika']);
        $first = Message::create(['channel_id' => $ch->id, 'user_id' => $jasur->id, 'body' => 'Bugun bozor bormi?']);

        $reply = $this->actingAs($malika)->postJson('/api/channels/umumiy/messages', ['body' => 'Ha, soat 9 da', 'reply_to_id' => $first->id])
            ->assertCreated()
            ->assertJsonPath('message.reply.id', $first->id)
            ->assertJsonPath('message.reply.a', 'Jasur')
            ->json('message.id');

        $n = UserNotification::where('user_id', $jasur->id)->firstOrFail();
        $this->assertSame('Malika sizga javob berdi', $n->title);
        $this->assertSame("#/chat/umumiy/$reply", $n->url);

        // Oʻziga javob yozsa — bildirishnoma yoʻq
        $this->actingAs($jasur)->postJson('/api/channels/umumiy/messages', ['body' => 'Rahmat', 'reply_to_id' => $first->id]);
        $this->assertSame(1, UserNotification::count());
    }

    public function test_reply_to_message_of_another_channel_is_ignored(): void
    {
        $a = Channel::create(['slug' => 'umumiy', 'name' => 'Umumiy']);
        $b = Channel::create(['slug' => 'yoshlar', 'name' => 'Yoshlar']);
        $other = Message::create(['channel_id' => $b->id, 'user_id' => User::factory()->create()->id, 'body' => 'x']);

        $this->actingAs(User::factory()->create())->postJson('/api/channels/umumiy/messages', ['body' => 'y', 'reply_to_id' => $other->id])
            ->assertCreated()->assertJsonPath('message.reply', null);
    }

    public function test_only_staff_can_delete_and_others_see_it_disappear(): void
    {
        $ch = Channel::create(['slug' => 'umumiy', 'name' => 'Umumiy']);
        $user = User::factory()->create();
        $m = Message::create(['channel_id' => $ch->id, 'user_id' => $user->id, 'body' => 'Reklama!']);

        $this->actingAs($user)->deleteJson("/api/channels/umumiy/messages/{$m->id}")->assertForbidden();
        $this->actingAs($user)->getJson('/api/channels/umumiy/messages')->assertJsonPath('can_delete', false);

        $mod = User::factory()->moderator()->create();
        $this->actingAs($mod)->getJson('/api/channels/umumiy/messages')->assertJsonPath('can_delete', true);
        $this->actingAs($mod)->deleteJson("/api/channels/umumiy/messages/{$m->id}")->assertOk();
        $this->assertSoftDeleted($m);

        // Polling qilayotgan foydalanuvchi oʻchirilganini biladi
        $this->actingAs($user)->getJson('/api/channels/umumiy/messages?after=1')->assertJsonPath('deleted', [$m->id]);
        $this->actingAs($user)->getJson('/api/channels/umumiy/messages')->assertJsonCount(0, 'messages');
    }
}
