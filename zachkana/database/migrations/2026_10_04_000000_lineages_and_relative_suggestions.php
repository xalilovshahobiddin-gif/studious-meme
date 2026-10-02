<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Urugʻ" endi "avlod" (bir bobokalon avlodlari) deb ataladi. Qabila urugʻi
 * (qovchin, barlos, xoʻja…) — avlodning ixtiyoriy belgisi (tribe).
 * Takliflar urugʻ orqali emas, qarindosh orqali: kimning farzandi / turmush oʻrtogʻi
 * yoki yangi avlod boshi (relation = child | spouse | root).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clans', function (Blueprint $table) {
            $table->string('tribe', 60)->nullable();
        });
        Schema::table('person_suggestions', function (Blueprint $table) {
            $table->string('relation', 10)->nullable();
            $table->string('lineage', 120)->nullable();
            $table->string('tribe', 60)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('clans', function (Blueprint $table) {
            $table->dropColumn('tribe');
        });
        Schema::table('person_suggestions', function (Blueprint $table) {
            $table->dropColumn(['relation', 'lineage', 'tribe']);
        });
    }
};
