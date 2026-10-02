<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatReactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_reactions_toggle_and_reach_other_users(): void
    {
        $ch = Channel::create(['slug' => 'umumiy', 'name' => 'Umumiy']);
        $jasur = User::factory()->create();
        $malika = User::factory()->create();
        $m = Message::create(['channel_id' => $ch->id, 'user_id' => $jasur->id, 'body' => 'Hashar shanba kuni']);
        $url = "/api/channels/umumiy/messages/{$m->id}/react";

        $this->actingAs($malika)->postJson($url, ['emoji' => '👍'])->assertOk()
            ->assertJsonPath('reactions', [['e' => '👍', 'n' => 1, 'me' => true]]);
        $this->actingAs($jasur)->postJson($url, ['emoji' => '👍']);
        $this->actingAs($jasur)->postJson($url, ['emoji' => '🤲'])
            ->assertJsonPath('reactions', [['e' => '👍', 'n' => 2, 'me' => true], ['e' => '🤲', 'n' => 1, 'me' => true]]);

        // Qayta bosish — olib tashlaydi
        $this->actingAs($jasur)->postJson($url, ['emoji' => '🤲'])->assertJsonPath('reactions', [['e' => '👍', 'n' => 2, 'me' => true]]);

        // Toʻliq roʻyxatda va polling javobida (eski xabar uchun) koʻrinadi
        $this->actingAs($malika)->getJson('/api/channels/umumiy/messages')
            ->assertJsonPath('messages.0.reactions', [['e' => '👍', 'n' => 2, 'me' => true]]);
        $this->actingAs($malika)->getJson('/api/channels/umumiy/messages?after='.$m->id)
            ->assertJsonPath('messages', [])
            ->assertJsonPath("reactions.{$m->id}.0.n", 2);
    }

    public function test_only_allowed_emoji_and_same_channel(): void
    {
        $a = Channel::create(['slug' => 'umumiy', 'name' => 'Umumiy']);
        Channel::create(['slug' => 'yoshlar', 'name' => 'Yoshlar']);
        $u = User::factory()->create();
        $m = Message::create(['channel_id' => $a->id, 'user_id' => $u->id, 'body' => 'Salom']);

        $this->actingAs($u)->postJson("/api/channels/umumiy/messages/{$m->id}/react", ['emoji' => '💩'])->assertUnprocessable();
        $this->actingAs($u)->postJson("/api/channels/yoshlar/messages/{$m->id}/react", ['emoji' => '👍'])->assertNotFound();
        $this->postJson('/api/logout');
        auth()->logout();
        $this->postJson("/api/channels/umumiy/messages/{$m->id}/react", ['emoji' => '👍'])->assertUnauthorized();
    }
}
