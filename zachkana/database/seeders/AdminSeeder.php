<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/** .env dagi ADMIN_LOGIN va ADMIN_PASSWORD boʻyicha birinchi administratorni yaratadi. */
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $login = mb_strtolower((string) env('ADMIN_LOGIN', 'admin'));
        $password = env('ADMIN_PASSWORD');
        if (! $login || ! $password) {
            $this->command?->warn('ADMIN_PASSWORD berilmagan — administrator yaratilmadi. "php artisan zachkana:admin" dan foydalaning.');

            return;
        }

        User::updateOrCreate(
            ['username' => $login],
            ['name' => env('ADMIN_NAME', 'Administrator'), 'password' => $password, 'role' => 'admin'],
        );
        $this->command?->info('Administrator tayyor: '.$login);
    }
}
