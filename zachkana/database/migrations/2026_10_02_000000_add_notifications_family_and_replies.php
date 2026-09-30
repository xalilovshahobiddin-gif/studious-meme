<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Shaxsiy bildirishnomalar (javob, taklif tasdiqlandi va h.k.). Eʼlonlar alohida —
        // ular hammaga birdek koʻrinadi, oʻqilgani users.notifications_seen_at orqali aniqlanadi.
        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 32);
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('url')->nullable(); // saytdagi manzil: #/chat/umumiy/15
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'read_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('notifications_seen_at')->nullable();
        });

        // Chatda javob berish
        Schema::table('messages', function (Blueprint $table) {
            $table->foreignId('reply_to_id')->nullable()->after('user_id')->constrained('messages')->nullOnDelete();
        });

        // Oilaviy shajara — har bir foydalanuvchining shaxsiy daraxti (faqat oʻziga koʻrinadi)
        Schema::create('family_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('family_members')->nullOnDelete();
            $table->foreignId('spouse_id')->nullable()->constrained('family_members')->cascadeOnDelete();
            $table->string('name');
            $table->char('gender', 1);
            $table->unsignedSmallInteger('birth_year')->nullable();
            $table->unsignedSmallInteger('death_year')->nullable();
            $table->string('job')->nullable();
            $table->text('bio')->nullable();
            $table->boolean('is_me')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->index(['user_id', 'parent_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_members');
        Schema::table('messages', fn (Blueprint $t) => $t->dropConstrainedForeignId('reply_to_id'));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('notifications_seen_at'));
        Schema::dropIfExists('user_notifications');
    }
};
