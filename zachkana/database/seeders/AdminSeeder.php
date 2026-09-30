<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/** .env dagi ADMIN_PHONE va ADMIN_PASSWORD boʻyicha birinchi administratorni yaratadi. */
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $phone = env('ADMIN_PHONE');
        $password = env('ADMIN_PASSWORD');
        if (! $phone || ! $password) {
            $this->command?->warn('ADMIN_PHONE / ADMIN_PASSWORD berilmagan — administrator yaratilmadi. "php artisan zachkana:admin" dan foydalaning.');

            return;
        }

        User::updateOrCreate(
            ['phone' => User::normalizePhone($phone)],
            ['name' => env('ADMIN_NAME', 'Administrator'), 'password' => $password, 'role' => 'admin'],
        );
        $this->command?->info('Administrator tayyor: '.User::normalizePhone($phone));
    }
}
