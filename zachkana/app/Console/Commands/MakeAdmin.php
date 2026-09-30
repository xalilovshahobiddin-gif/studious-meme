<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('zachkana:admin {phone : Telefon raqam, masalan 901234567} {--name=Administrator} {--role=admin : admin yoki moderator}')]
#[Description('Administrator yoki moderator yaratadi (yoki mavjud foydalanuvchiga rol beradi)')]
class MakeAdmin extends Command
{
    public function handle(): int
    {
        $phone = User::normalizePhone($this->argument('phone'));
        $role = $this->option('role');
        if (! in_array($role, ['admin', 'moderator'], true)) {
            $this->error('Rol faqat admin yoki moderator boʻlishi mumkin.');

            return self::FAILURE;
        }

        $user = User::where('phone', $phone)->first();
        if ($user) {
            $user->update(['role' => $role]);
            $this->info("{$user->name} ({$phone}) endi: {$role}");

            return self::SUCCESS;
        }

        $password = $this->secret('Parol (kamida 6 belgi)');
        if (strlen((string) $password) < 6) {
            $this->error('Parol juda qisqa.');

            return self::FAILURE;
        }
        User::create(['name' => $this->option('name'), 'phone' => $phone, 'password' => $password, 'role' => $role]);
        $this->info("Yaratildi: {$phone} ({$role}). Admin panel: /admin");

        return self::SUCCESS;
    }
}
