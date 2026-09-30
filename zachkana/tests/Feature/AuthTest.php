<?php

namespace Tests\Feature;

use App\Filament\Pages\Auth\Login;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_with_username_and_login(): void
    {
        $this->postJson('/api/register', ['name' => 'Sardor', 'username' => ' Sardor_R ', 'password' => 'parol123'])
            ->assertCreated()
            ->assertJsonPath('user.username', 'sardor_r')
            ->assertJsonPath('user.methods', ['password'])
            ->assertJsonPath('user.role', 'user');
        $this->assertAuthenticated();

        $this->postJson('/api/logout')->assertOk();
        $this->assertGuest();

        $this->postJson('/api/login', ['login' => 'sardor_r', 'password' => 'xato'])->assertJsonValidationErrors('login');
        $this->postJson('/api/login', ['login' => 'SARDOR_R', 'password' => 'parol123'])->assertOk();
        $this->assertAuthenticated();
    }

    public function test_username_rules(): void
    {
        User::factory()->create(['username' => 'band']);

        $this->postJson('/api/register', ['name' => 'X', 'username' => 'band', 'password' => 'parol123'])->assertJsonValidationErrors('username');
        $this->postJson('/api/register', ['name' => 'Xolid', 'username' => 'oʻzbek', 'password' => 'parol123'])->assertJsonValidationErrors('username');
        $this->postJson('/api/register', ['name' => 'Xolid', 'username' => 'ab', 'password' => 'parol123'])->assertJsonValidationErrors('username');
    }

    public function test_phone_login_is_disabled_by_default_and_can_be_enabled(): void
    {
        User::factory()->create(['phone' => '998901234567', 'password' => 'parol123']);

        $this->postJson('/api/phone/login', ['phone' => '901234567', 'password' => 'parol123'])->assertNotFound();
        $this->postJson('/api/phone/register', ['name' => 'A', 'phone' => '901112233', 'password' => 'parol123'])->assertNotFound();
        $this->getJson('/api/bootstrap')->assertJsonPath('auth.phone', false);

        Setting::put('auth_phone', '1');

        $this->getJson('/api/bootstrap')->assertJsonPath('auth.phone', true);
        $this->postJson('/api/phone/login', ['phone' => '90 123 45 67', 'password' => 'parol123'])->assertOk();
        $this->assertAuthenticated();
    }

    public function test_password_login_can_be_disabled(): void
    {
        Setting::put('auth_password', '0');

        $this->postJson('/api/login', ['login' => 'x', 'password' => 'y'])->assertNotFound();
        $this->postJson('/api/register', ['name' => 'X', 'username' => 'xxx', 'password' => 'parol123'])->assertNotFound();
        $this->getJson('/api/bootstrap')->assertJsonPath('auth.password', false);
    }

    public function test_only_staff_can_access_admin_panel(): void
    {
        $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();
        $this->actingAs(User::factory()->moderator()->create())->get('/admin')->assertOk();
    }

    public function test_admin_panel_login_with_username(): void
    {
        User::factory()->admin()->create(['username' => 'admin', 'password' => 'Admin#2026']);

        Livewire::test(Login::class)
            ->fillForm(['login' => 'admin', 'password' => 'xato'])
            ->call('authenticate')
            ->assertHasFormErrors(['login']);
        $this->assertGuest();

        Livewire::test(Login::class)
            ->fillForm(['login' => 'Admin', 'password' => 'Admin#2026'])
            ->call('authenticate')
            ->assertHasNoFormErrors();
        $this->assertAuthenticated();
    }
}
