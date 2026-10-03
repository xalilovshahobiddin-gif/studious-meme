<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * v0.0.9 — tanishtiruv qoʻshildi. Undan oldin 2-darajadan oshgan oʻyinchilar uni oʻtgan deb hisoblanadi
 * (aks holda ularning XP si tanishtiruv tugaguncha toʻxtab qolardi).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('players')->where('level', '>=', 2)->update(['tutorial_step' => 23]);
    }

    public function down(): void
    {
        //
    }
};
