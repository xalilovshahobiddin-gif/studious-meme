<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Hozircha telefon raqam + parol. SMS orqali tasdiqlash keyingi bosqichda
 * shu yerga qoʻshiladi (phone_verified_at maydoni tayyor).
 */
class AuthController extends Controller
{
    public static function present(?User $u): ?array
    {
        return $u ? [
            'id' => $u->id,
            'name' => $u->name,
            'phone' => $u->phone,
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
        $request->merge(['phone' => User::normalizePhone((string) $request->input('phone'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'phone' => ['required', 'regex:/^998\d{9}$/', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:6', 'max:100'],
        ], ['phone.unique' => 'Bu raqam allaqachon roʻyxatdan oʻtgan. Kirish boʻlimidan foydalaning.']);

        $user = User::create($data + ['role' => 'user']);
        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json(['user' => self::present($user)], 201);
    }

    public function login(Request $request): JsonResponse
    {
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

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['user' => null]);
    }
}
