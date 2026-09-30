<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_messages_require_login(): void
    {
        Channel::create(['slug' => 'umumiy', 'name' => 'Umumiy']);
        $this->getJson('/api/channels/umumiy/messages')->assertUnauthorized();
    }

    public function test_post_and_poll_new_messages(): void
    {
        Channel::create(['slug' => 'umumiy', 'name' => 'Umumiy']);
        $a = User::factory()->create(['name' => 'Jasur']);
        $b = User::factory()->create(['name' => 'Malika']);

        $first = $this->actingAs($a)->postJson('/api/channels/umumiy/messages', ['body' => '  Salom!  '])
            ->assertCreated()
            ->assertJsonPath('message.text', 'Salom!')
            ->assertJsonPath('message.me', true)
            ->json('message.id');

        $this->actingAs($b)->postJson('/api/channels/umumiy/messages', ['body' => 'Vaalaykum'])->assertCreated();

        // A foydalanuvchi faqat oʻzidan keyingi xabarlarni oladi
        $this->actingAs($a)->getJson("/api/channels/umumiy/messages?after={$first}")
            ->assertOk()
            ->assertJsonCount(1, 'messages')
            ->assertJsonPath('messages.0.a', 'Malika')
            ->assertJsonPath('messages.0.me', false);
    }

    public function test_readonly_channel_only_for_staff(): void
    {
        Channel::create(['slug' => 'elonlar', 'name' => 'Eʼlonlar', 'is_readonly' => true]);

        $this->actingAs(User::factory()->create())->postJson('/api/channels/elonlar/messages', ['body' => 'Salom'])->assertForbidden();
        $this->actingAs(User::factory()->moderator()->create())->postJson('/api/channels/elonlar/messages', ['body' => 'Hashar!'])->assertCreated();
    }

    public function test_empty_message_is_rejected(): void
    {
        Channel::create(['slug' => 'umumiy', 'name' => 'Umumiy']);
        $this->actingAs(User::factory()->create())->postJson('/api/channels/umumiy/messages', ['body' => ''])->assertUnprocessable();
    }
}
