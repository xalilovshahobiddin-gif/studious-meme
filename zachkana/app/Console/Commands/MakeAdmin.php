<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('zachkana:admin {login : Login (lotin harflari, raqamlar, _ va .)} {--name=Administrator} {--role=admin : admin yoki moderator}')]
#[Description('Administrator yoki moderator yaratadi (yoki mavjud foydalanuvchiga rol beradi)')]
class MakeAdmin extends Command
{
    public function handle(): int
    {
        $login = mb_strtolower($this->argument('login'));
        $role = $this->option('role');
        if (! in_array($role, ['admin', 'moderator'], true)) {
            $this->error('Rol faqat admin yoki moderator boʻlishi mumkin.');

            return self::FAILURE;
        }
        if (! preg_match('/^[a-z0-9_.]{3,32}$/', $login)) {
            $this->error('Login faqat lotin harflari, raqamlar, "_" va "." dan iborat boʻlsin (3–32 belgi).');

            return self::FAILURE;
        }

        $user = User::where('username', $login)->first();
        if ($user) {
            $user->update(['role' => $role]);
            $this->info("{$user->name} ({$login}) endi: {$role}");

            return self::SUCCESS;
        }

        $password = $this->secret('Parol (kamida 8 belgi)');
        if (strlen((string) $password) < 8) {
            $this->error('Parol juda qisqa.');

            return self::FAILURE;
        }
        User::create(['name' => $this->option('name'), 'username' => $login, 'password' => $password, 'role' => $role]);
        $this->info("Yaratildi: {$login} ({$role}). Admin panel: /admin");

        return self::SUCCESS;
    }
}
