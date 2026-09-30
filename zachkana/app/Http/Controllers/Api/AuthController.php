<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuthSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Login + parol bilan kirish. Google va Telegram — SocialAuthController.
 * Telefon + parol (keyinchalik SMS) usuli vaqtincha oʻchirilgan: kodi pastda saqlangan,
 * admin paneldagi "Kirish sozlamalari"dan yoqilsa yana ishlaydi.
 */
class AuthController extends Controller
{
    public static function present(?User $u): ?array
    {
        return $u ? [
            'id' => $u->id,
            'name' => $u->name,
            'username' => $u->username,
            'phone' => $u->phone,
            'email' => $u->email,
            'avatar' => $u->avatar,
            'methods' => $u->loginMethods(),
            'role' => $u->role,
            'staff' => $u->isStaff(),
        ] : null;
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => self::present($request->user())]);
    }

    public function register(Request $request): JsonResponse
    {
        abort_unless(AuthSettings::passwordEnabled(), 404);
        $request->merge(['username' => mb_strtolower(trim((string) $request->input('username')))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'username' => ['required', User::USERNAME_RULE, 'unique:users,username'],
            'password' => ['required', 'string', 'min:6', 'max:100'],
        ], [
            'username.regex' => 'Login faqat lotin harflari, raqamlar, "_" va "." dan iborat boʻlsin (3–32 belgi).',
            'username.unique' => 'Bu login band. Boshqasini tanlang.',
        ]);

        return $this->signIn($request, User::create($data + ['role' => 'user']), 201);
    }

    public function login(Request $request): JsonResponse
    {
        abort_unless(AuthSettings::passwordEnabled(), 404);
        $data = $request->validate([
            'login' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt(['username' => mb_strtolower(trim($data['login'])), 'password' => $data['password']], true)) {
            throw ValidationException::withMessages(['login' => 'Login yoki parol notoʻgʻri.']);
        }
        $request->session()->regenerate();

        return response()->json(['user' => self::present($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['user' => null]);
    }

    /* ---- Telefon raqam orqali (vaqtincha oʻchirilgan, AuthSettings::phoneEnabled) ---- */

    public function phoneRegister(Request $request): JsonResponse
    {
        abort_unless(AuthSettings::phoneEnabled(), 404);
        $request->merge(['phone' => User::normalizePhone((string) $request->input('phone'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'phone' => ['required', 'regex:/^998\d{9}$/', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:6', 'max:100'],
        ], ['phone.unique' => 'Bu raqam allaqachon roʻyxatdan oʻtgan. Kirish boʻlimidan foydalaning.']);

        return $this->signIn($request, User::create($data + ['role' => 'user']), 201);
    }

    public function phoneLogin(Request $request): JsonResponse
    {
        abort_unless(AuthSettings::phoneEnabled(), 404);
        $request->merge(['phone' => User::normalizePhone((string) $request->input('phone'))]);
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($data, true)) {
            throw ValidationException::withMessages(['phone' => 'Telefon raqam yoki parol notoʻgʻri.']);
        }
        $request->session()->regenerate();

        return response()->json(['user' => self::present($request->user())]);
    }

    private function signIn(Request $request, User $user, int $status = 200): JsonResponse
    {
        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json(['user' => self::present($user)], $status);
    }
}
