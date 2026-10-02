<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * php artisan db:seed — administrator, zarur maʼlumotlar va namuna maʼlumotlar (ishlab chiqish uchun).
     * Faqat administrator kerak boʻlsa: php artisan db:seed --class=AdminSeeder
     */
    public function run(): void
    {
        $this->call([AdminSeeder::class, EssentialsSeeder::class, SampleDataSeeder::class]);
    }
}
