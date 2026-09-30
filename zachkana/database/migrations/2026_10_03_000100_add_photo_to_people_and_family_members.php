<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['people', 'family_members'] as $t) {
            Schema::table($t, function (Blueprint $table) {
                $table->string('photo')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['people', 'family_members'] as $t) {
            Schema::table($t, function (Blueprint $table) {
                $table->dropColumn('photo');
            });
        }
    }
};
