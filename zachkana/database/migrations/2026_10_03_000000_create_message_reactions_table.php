<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('emoji', 16);
            $table->timestamps();
            $table->unique(['message_id', 'user_id', 'emoji']);
        });

        // Polling boshqa foydalanuvchilarning reaksiyalarini ham olib kelishi uchun
        Schema::table('messages', function (Blueprint $table) {
            $table->timestamp('reacted_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('reacted_at');
        });
        Schema::dropIfExists('message_reactions');
    }
};
