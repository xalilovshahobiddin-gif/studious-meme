<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * php artisan db:seed — administrator + namuna maʼlumotlar.
     * Faqat administrator kerak boʻlsa: php artisan db:seed --class=AdminSeeder
     */
    public function run(): void
    {
        $this->call([AdminSeeder::class, SampleDataSeeder::class]);
    }
}
