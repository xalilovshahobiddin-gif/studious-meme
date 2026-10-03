<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * v0.0.8 — vazifalar: kundalik, haftalik, oylik + sandiqlar, kirish taqvimi va kun kombosi (GDD bo'lim 14).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_quests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->enum('period', ['d', 'w', 'm'])->comment('d kundalik · w haftalik · m oylik');
            $table->unsignedInteger('period_key')->comment('Kun/hafta/oy raqami (UTC + quest_tz_offset_h)');
            $table->string('quest_key', 24)->comment("'chest' — davr sandigʻi");
            $table->string('metric', 24);
            $table->unsignedInteger('target');
            $table->decimal('progress', 14, 2)->default(0)->comment('Kasr ham boʻladi (goʻsht kg)');
            $table->json('reward')->nullable()->comment('Faqat resurslar; sandiqda — olinganda yoziladi');
            $table->timestamp('claimed_at', 3)->nullable();
            $table->unique(['player_id', 'period', 'period_key', 'quest_key'], 'ux_player_quest');
        });

        Schema::table('players', function (Blueprint $table) {
            $table->unsignedInteger('login_day_key')->nullable()->comment('Oxirgi kirish kuni (login vazifasi uchun)');
            $table->unsignedInteger('login_claimed_key')->nullable()->comment('Kirish sovgʻasi olingan oxirgi kun');
            $table->unsignedTinyInteger('login_streak')->default(0)->comment('Kirish taqvimi: 1..7');
            $table->unsignedInteger('combo_day_key')->nullable()->comment('Kun sandigʻi olingan oxirgi kun');
            $table->unsignedSmallInteger('combo_streak')->default(0)->comment('Kun kombosi: ketma-ket kunlar');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['login_day_key', 'login_claimed_key', 'login_streak', 'combo_day_key', 'combo_streak']);
        });
        Schema::dropIfExists('player_quests');
    }
};
