<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Support\TelegramLogin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use Mockery;
use Tests\TestCase;

class SocialAuthTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = '123456:TEST-TOKEN';

    /** Telegram vidjeti yuboradigan maʼlumot (toʻgʻri imzo bilan) */
    private function telegramPayload(array $fields): array
    {
        ksort($fields);
        $check = implode("\n", array_map(fn ($k, $v) => "$k=$v", array_keys($fields), $fields));

        return $fields + ['hash' => hash_hmac('sha256', $check, hash('sha256', self::TOKEN, true))];
    }

    private function enableTelegram(): void
    {
        Setting::put('telegram_bot_username', '@zachkana_bot');
        Setting::put('telegram_bot_token', self::TOKEN);
    }

    private function enableGoogle(): void
    {
        Setting::put('google_client_id', 'client-id');
        Setting::put('google_client_secret', 'client-secret');
    }

    private function mockGoogle(string $id, ?string $email, string $name = 'Dilnoza Rustamova'): void
    {
        $user = (new GoogleUser)->map(['id' => $id, 'name' => $name, 'email' => $email, 'avatar' => 'https://example.com/a.png']);
        $provider = Mockery::mock();
        $provider->shouldReceive('user')->andReturn($user);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    public function test_telegram_signature_verification(): void
    {
        $now = time();
        $data = $this->telegramPayload(['id' => '42', 'first_name' => 'Oybek', 'auth_date' => (string) $now]);

        $this->assertSame('Oybek', TelegramLogin::verify($data, self::TOKEN, $now)['first_name']);
        $this->assertNull(TelegramLogin::verify(['first_name' => 'Boshqa'] + $data, self::TOKEN, $now), 'oʻzgartirilgan maʼlumot');
        $this->assertNull(TelegramLogin::verify($data, 'boshqa:token', $now), 'boshqa bot');
        $this->assertNull(TelegramLogin::verify($data, self::TOKEN, $now + TelegramLogin::MAX_AGE + 1), 'eskirgan');
        $this->assertNull(TelegramLogin::verify(['id' => '42'], self::TOKEN, $now), 'imzosiz');
    }

    public function test_social_logins_are_hidden_until_configured(): void
    {
        $this->getJson('/api/bootstrap')->assertJsonPath('auth.google', false)->assertJsonPath('auth.telegram', null);
        $this->get('/auth/google/redirect')->assertNotFound();
        $this->get('/auth/telegram/callback')->assertNotFound();

        $this->enableGoogle();
        $this->enableTelegram();
        $this->getJson('/api/bootstrap')->assertJsonPath('auth.google', true)->assertJsonPath('auth.telegram', 'zachkana_bot');

        Setting::put('auth_google', '0');
        $this->getJson('/api/bootstrap')->assertJsonPath('auth.google', false);
    }

    public function test_telegram_login_creates_user_and_logs_in(): void
    {
        $this->enableTelegram();
        $payload = $this->telegramPayload(['id' => '777', 'first_name' => 'Oybek', 'last_name' => 'Jasurov', 'auth_date' => (string) time()]);

        $this->get('/auth/telegram/callback?'.http_build_query($payload))->assertRedirect(url('/').'/#/profil');

        $user = User::where('telegram_id', 777)->firstOrFail();
        $this->assertSame('Oybek Jasurov', $user->name);
        $this->assertAuthenticatedAs($user);
        $this->getJson('/api/bootstrap')->assertJsonPath('notice', 'Xush kelibsiz, Oybek!')->assertJsonPath('user.methods', ['telegram']);

        // Ikkinchi marta — yangi foydalanuvchi yaratilmaydi
        $this->post('/api/logout');
        $this->get('/auth/telegram/callback?'.http_build_query($payload));
        $this->assertSame(1, User::where('telegram_id', 777)->count());
    }

    public function test_telegram_forged_data_is_rejected(): void
    {
        $this->enableTelegram();
        $payload = ['id' => '1', 'first_name' => 'X', 'auth_date' => (string) time(), 'hash' => str_repeat('a', 64)];

        $this->get('/auth/telegram/callback?'.http_build_query($payload))->assertRedirect();
        $this->assertGuest();
        $this->getJson('/api/bootstrap')->assertJsonPath('error', 'Telegram maʼlumotlari tasdiqlanmadi. Qaytadan urinib koʻring.');
    }

    public function test_logged_in_user_links_telegram(): void
    {
        $this->enableTelegram();
        $user = User::factory()->create(['username' => 'sardor']);
        $payload = $this->telegramPayload(['id' => '555', 'first_name' => 'Sardor', 'auth_date' => (string) time()]);

        // Profil sahifasidan boshlanmagan ulash (begona havola) — rad etiladi
        $this->actingAs($user)->get('/auth/telegram/callback?'.http_build_query($payload));
        $this->assertNull($user->fresh()->telegram_id);

        $this->postJson('/api/link/telegram')->assertOk();
        $this->get('/auth/telegram/callback?'.http_build_query($payload));

        $this->assertSame(555, (int) $user->fresh()->telegram_id);
        $this->assertSame(1, User::count());
        $this->assertEqualsCanonicalizing(['password', 'telegram'], $user->fresh()->loginMethods());
    }

    public function test_google_login_creates_user(): void
    {
        $this->enableGoogle();
        $this->mockGoogle('g-1', 'dilnoza@example.com');

        $this->get('/auth/google/callback?code=x&state=y')->assertRedirect(url('/').'/#/profil');

        $user = User::where('google_id', 'g-1')->firstOrFail();
        $this->assertSame('dilnoza@example.com', $user->email);
        $this->assertAuthenticatedAs($user);
    }

    public function test_google_links_to_existing_account_by_email(): void
    {
        $this->enableGoogle();
        $existing = User::factory()->create(['username' => 'dilnoza', 'email' => 'dilnoza@example.com']);
        $this->mockGoogle('g-2', 'dilnoza@example.com');

        $this->get('/auth/google/callback?code=x&state=y');

        $this->assertSame('g-2', $existing->fresh()->google_id);
        $this->assertAuthenticatedAs($existing);
        $this->assertSame(1, User::count());
    }

    public function test_google_account_of_another_user_cannot_be_linked(): void
    {
        $this->enableGoogle();
        User::factory()->create(['google_id' => 'g-3']);
        $me = User::factory()->create();
        $this->mockGoogle('g-3', null);

        $this->actingAs($me)->get('/auth/google/callback?code=x&state=y');

        $this->assertNull($me->fresh()->google_id);
        $this->getJson('/api/bootstrap')->assertJsonPath('error', 'Bu Google akkaunti boshqa profilga ulangan.');
    }
}
