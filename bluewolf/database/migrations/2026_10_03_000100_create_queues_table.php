<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * v0.0.3 — qurilish navbati (docs/blue_wolf/blue_wolf_schema.sql → queues).
 * kind: hozircha faqat 'build'; train/promote/heal v0.3 da ishlatiladi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->enum('kind', ['build', 'train', 'promote', 'heal']);
            $table->unsignedTinyInteger('slot')->default(1)->comment('build uchun 1 yoki 2');
            $table->enum('building_type', ['food_cave', 'workshop', 'scout_rock', 'battle_ground',
                'defense_wall', 'hunt_path', 'hospital', 'market'])->nullable()->comment("'den' hech qachon navbatga tushmaydi");
            $table->unsignedTinyInteger('target_level')->nullable();
            $table->json('cost')->comment('Yechilgan resurslar — bekor qilishda 80% qaytarish uchun');
            $table->timestamp('started_at', 3);
            $table->timestamp('ends_at', 3);
            $table->unsignedInteger('speeded_sec')->default(0);
            $table->enum('state', ['running', 'done', 'cancelled'])->default('running');
            $table->index(['player_id', 'state'], 'ix_queue_player');
            $table->index(['state', 'ends_at'], 'ix_queue_ends');
        });

        Schema::table('players', function (Blueprint $table) {
            $table->unsignedSmallInteger('free_speedups')->default(0)->comment('Bepul tezlashtirishlar (har biri 1 soatgacha)');
            $table->boolean('second_queue_early')->default(false)->comment('2-navbat 4–9 darajada sotib olingan');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['free_speedups', 'second_queue_early']);
        });
        Schema::dropIfExists('queues');
    }
};
