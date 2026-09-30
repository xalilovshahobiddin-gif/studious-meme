<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AuthSettings;
use App\Support\TelegramLogin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

/**
 * Google va Telegram orqali kirish. Foydalanuvchi allaqachon kirgan boʻlsa,
 * akkaunt uning profiliga ulanadi (keyin ikkala usul bilan ham kira oladi).
 * Natija sessiyaga yoziladi va /api/bootstrap orqali frontendga koʻrsatiladi.
 */
class SocialAuthController extends Controller
{
    public function googleRedirect(): RedirectResponse
    {
        abort_unless($this->configureGoogle(), 404);

        return Socialite::driver('google')->redirect();
    }

    public function googleCallback(Request $request): RedirectResponse
    {
        abort_unless($this->configureGoogle(), 404);
        try {
            $g = Socialite::driver('google')->user();
        } catch (Throwable) {
            return $this->fail($request, 'Google orqali kirib boʻlmadi. Qaytadan urinib koʻring.');
        }

        return $this->finish($request, 'google_id', (string) $g->getId(), [
            'name' => $g->getName() ?: $g->getNickname() ?: 'Google foydalanuvchisi',
            'email' => $g->getEmail(),
            'avatar' => $g->getAvatar(),
        ], 'Google');
    }

    public function telegramCallback(Request $request): RedirectResponse
    {
        $cfg = AuthSettings::telegram();
        abort_unless($cfg !== null, 404);

        $tg = TelegramLogin::verify($request->query(), $cfg['bot_token']);
        if (! $tg) {
            return $this->fail($request, 'Telegram maʼlumotlari tasdiqlanmadi. Qaytadan urinib koʻring.');
        }

        return $this->finish($request, 'telegram_id', $tg['id'], [
            'name' => trim(($tg['first_name'] ?? '').' '.($tg['last_name'] ?? '')) ?: ($tg['username'] ?? 'Telegram foydalanuvchisi'),
            'avatar' => $tg['photo_url'] ?? null,
        ], 'Telegram');
    }

    /** Profil sahifasi ochilganda: foydalanuvchi Telegram akkauntini ulamoqchi */
    public function linkIntent(Request $request): JsonResponse
    {
        abort_unless(AuthSettings::telegram() !== null, 404);
        $request->session()->put('link_telegram', time());

        return response()->json(['ok' => true]);
    }

    private function configureGoogle(): bool
    {
        $cfg = AuthSettings::google();
        if ($cfg) {
            config(['services.google' => $cfg]);
        }

        return $cfg !== null;
    }

    /** @param  array{name: string, email?: ?string, avatar?: ?string}  $profile */
    private function finish(Request $request, string $column, string $id, array $profile, string $provider): RedirectResponse
    {
        $owner = User::where($column, $id)->first();
        $current = $request->user();

        // Kirgan foydalanuvchi — akkauntni profilga ulash
        if ($current) {
            // Telegram imzosi sessiyaga bogʻlanmagan, shuning uchun ulash faqat profil
            // sahifasidan boshlangan boʻlsa (linkIntent) ruxsat etiladi — aks holda begona
            // havola orqali birovning Telegram akkaunti profilingizga ulanib qolishi mumkin.
            $intent = (int) $request->session()->pull('link_telegram');
            if ($column === 'telegram_id' && $owner?->id !== $current->id && time() - $intent > 600) {
                return $this->fail($request, 'Telegram akkauntini profil sahifasidan ulang.');
            }
            if ($owner && $owner->id !== $current->id) {
                return $this->fail($request, "Bu $provider akkaunti boshqa profilga ulangan.");
            }
            $current->forceFill([$column => $id, 'avatar' => $current->avatar ?: ($profile['avatar'] ?? null)])->save();
            $request->session()->flash('auth_notice', "$provider akkaunti profilingizga ulandi.");

            return redirect()->to(url('/').'/#/profil');
        }

        // Google: shu email bilan roʻyxatdan oʻtgan profil boʻlsa — unga ulanadi
        if (! $owner && ! empty($profile['email'])) {
            $owner = User::where('email', $profile['email'])->first();
            $owner?->forceFill([$column => $id])->save();
        }

        $user = $owner ?? User::create([
            'name' => mb_substr($profile['name'], 0, 80),
            'email' => $profile['email'] ?? null,
            'avatar' => $profile['avatar'] ?? null,
            'role' => 'user',
        ])->forceFill([$column => $id]);
        $user->save();

        Auth::login($user, true);
        $request->session()->regenerate();
        $request->session()->flash('auth_notice', 'Xush kelibsiz, '.strtok($user->name, ' ').'!');

        return redirect()->to(url('/').'/#/profil');
    }

    private function fail(Request $request, string $message): RedirectResponse
    {
        $request->session()->flash('auth_error', $message);

        return redirect()->to(url('/').'/#/profil');
    }
}
