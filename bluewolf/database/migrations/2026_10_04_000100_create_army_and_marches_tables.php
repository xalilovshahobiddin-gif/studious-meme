<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * v0.0.4 — askarlar, mashq va ov (docs/blue_wolf/blue_wolf_schema.sql → army, marches, queues).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('army', function (Blueprint $table) {
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['scout', 'attacker', 'defender', 'hunter']);
            $table->unsignedTinyInteger('tier')->comment('1..6');
            $table->unsignedInteger('alive')->default(0)->comment('Inda turgan sogʻlom askar');
            $table->unsignedInteger('on_march')->default(0)->comment('Yurishdagi askar (ov, …)');
            $table->unsignedInteger('injured')->default(0);
            $table->primary(['player_id', 'role', 'tier']);
        });

        Schema::create('marches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->enum('kind', ['hunt', 'attack', 'scout', 'camp', 'oasis', 'war']);
            $table->json('payload')->comment('{rol: {tier: soni}}');
            $table->json('loot')->nullable()->comment('Olib kelinadigan natija');
            $table->timestamp('departs_at', 3);
            $table->timestamp('arrives_at', 3)->comment('Ov uchun — ov tugash vaqti');
            $table->timestamp('returns_at', 3)->nullable();
            $table->enum('state', ['outbound', 'fighting', 'gathering', 'returning', 'done', 'recalled'])->default('outbound');
            $table->index(['player_id', 'state'], 'ix_march_player');
            $table->index(['state', 'returns_at'], 'ix_march_return');
        });

        Schema::table('queues', function (Blueprint $table) {
            $table->enum('role', ['scout', 'attacker', 'defender', 'hunter'])->nullable()->after('target_level');
            $table->unsignedTinyInteger('tier')->nullable()->after('role');
            $table->unsignedInteger('qty')->nullable()->after('tier');
        });

        Schema::table('players', function (Blueprint $table) {
            $table->decimal('xp', 14, 2)->default(0)->change();
            $table->timestamp('solo_hunt_at', 3)->nullable()->comment('Oxirgi yolgʻiz ov (2 daqiqa kutish)');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('solo_hunt_at');
            $table->unsignedBigInteger('xp')->default(0)->change();
        });
        Schema::table('queues', function (Blueprint $table) {
            $table->dropColumn(['role', 'tier', 'qty']);
        });
        Schema::dropIfExists('marches');
        Schema::dropIfExists('army');
    }
};
