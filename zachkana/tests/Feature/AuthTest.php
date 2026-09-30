<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_normalizes_phone_and_logs_in(): void
    {
        $this->postJson('/api/register', ['name' => 'Sardor', 'phone' => '+998 90 123-45-67', 'password' => 'parol123'])
            ->assertCreated()
            ->assertJsonPath('user.phone', '998901234567')
            ->assertJsonPath('user.role', 'user');

        $this->assertAuthenticated();
        $this->getJson('/api/me')->assertJsonPath('user.name', 'Sardor');
    }

    public function test_register_rejects_duplicate_phone(): void
    {
        User::factory()->create(['phone' => '998901234567']);

        $this->postJson('/api/register', ['name' => 'Boshqa', 'phone' => '901234567', 'password' => 'parol123'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('phone');
    }

    public function test_login_with_short_phone_and_logout(): void
    {
        User::factory()->create(['phone' => '998901234567', 'password' => 'parol123']);

        $this->postJson('/api/login', ['phone' => '90 123 45 67', 'password' => 'xato'])->assertUnprocessable();
        $this->assertGuest();

        $this->postJson('/api/login', ['phone' => '90 123 45 67', 'password' => 'parol123'])->assertOk();
        $this->assertAuthenticated();

        $this->postJson('/api/logout')->assertOk();
        $this->assertGuest();
    }

    public function test_only_staff_can_access_admin_panel(): void
    {
        $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();
        $this->actingAs(User::factory()->moderator()->create())->get('/admin')->assertOk();
    }
}
