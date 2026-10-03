<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * v0.0.0 — oʻyin skeleti uchun asosiy jadvallar.
 * Toʻliq sxema: docs/blue_wolf/blue_wolf_schema.sql (30 jadval). Qolgan jadvallar
 * tegishli bosqichlarda alohida migratsiyalar bilan qoʻshiladi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tg_id')->unique()->comment('Telegram user id');
            $table->string('tg_username', 64)->nullable();
            $table->string('display_name', 48);
            $table->enum('lang', ['uz', 'ru', 'en'])->default('uz');
            $table->unsignedTinyInteger('level')->default(1);
            $table->unsignedBigInteger('xp')->default(0);
            $table->unsignedTinyInteger('tutorial_step')->default(0)->comment('0..20, 20 = tugagan');
            $table->enum('status', ['active', 'banned', 'deleted'])->default('active');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('last_seen_at', 3)->useCurrent();
            $table->index(['level', 'status']);
        });

        Schema::create('player_resources', function (Blueprint $table) {
            $table->foreignId('player_id')->primary()->constrained()->cascadeOnDelete();
            foreach (['meat', 'water', 'herb', 'moonlight', 'stone', 'wood', 'hide', 'bone',
                'buf_stone', 'buf_wood', 'buf_hide', 'buf_bone'] as $column) {
                $table->decimal($column, 20, 4)->default(0);
            }
            $table->unsignedInteger('moonstone')->default(0);
            $table->unsignedBigInteger('coins')->default(0);
            $table->unsignedTinyInteger('alloc_stone')->default(40);
            $table->unsignedTinyInteger('alloc_wood')->default(30);
            $table->unsignedTinyInteger('alloc_hide')->default(15);
            $table->unsignedTinyInteger('alloc_bone')->default(15);
            $table->timestamp('last_tick_at', 3)->useCurrent();
        });

        Schema::create('buildings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['den', 'food_cave', 'workshop', 'scout_rock', 'battle_ground',
                'defense_wall', 'hunt_path', 'hospital', 'market']);
            $table->unsignedTinyInteger('level')->default(1);
            $table->unique(['player_id', 'type']);
        });

        Schema::create('game_config', function (Blueprint $table) {
            $table->string('config_key', 64)->primary();
            $table->decimal('config_value', 18, 6);
            $table->string('unit', 24)->nullable();
            $table->string('note', 255)->nullable();
            $table->timestamp('updated_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_config');
        Schema::dropIfExists('buildings');
        Schema::dropIfExists('player_resources');
        Schema::dropIfExists('players');
    }
};
