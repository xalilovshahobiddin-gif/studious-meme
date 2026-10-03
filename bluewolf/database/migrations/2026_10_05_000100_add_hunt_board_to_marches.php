<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * v0.0.7 — ov xaritasi: har ov qaysi davrdagi qaysi kartadan ekani (karta bir marta ovlanadi).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marches', function (Blueprint $table) {
            $table->unsignedInteger('board_window')->nullable()->after('kind')->comment('Ov xaritasi davri');
            $table->unsignedTinyInteger('board_slot')->nullable()->after('board_window')->comment('0..8');
            $table->index(['player_id', 'board_window'], 'ix_march_board');
        });
    }

    public function down(): void
    {
        Schema::table('marches', function (Blueprint $table) {
            $table->dropIndex('ix_march_board');
            $table->dropColumn(['board_window', 'board_slot']);
        });
    }
};
