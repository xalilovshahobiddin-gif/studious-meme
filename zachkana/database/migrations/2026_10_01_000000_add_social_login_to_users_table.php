<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Kirishning yangi usullari: login + parol, Google va Telegram.
 * Telefon orqali kirish vaqtincha oʻchiriladi (kodi va maydonlari saqlanadi),
 * shuning uchun telefon va parol ixtiyoriy boʻladi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 32)->nullable()->unique()->after('name');
            $table->string('google_id')->nullable()->unique();
            $table->unsignedBigInteger('telegram_id')->nullable()->unique();
            $table->string('avatar')->nullable();
            $table->string('phone', 20)->nullable()->change();
            $table->string('password')->nullable()->change();
        });

        // Mavjud foydalanuvchilar kira olishi uchun login beriladi:
        // birinchi administrator — "admin", qolganlar — telefon raqami (998901234567).
        $firstAdmin = DB::table('users')->where('role', 'admin')->orderBy('id')->value('id');
        DB::table('users')->whereNull('username')->orderBy('id')->get(['id', 'phone'])
            ->each(function ($u) use ($firstAdmin) {
                $username = $u->id === $firstAdmin ? 'admin' : ($u->phone ?: 'user'.$u->id);
                DB::table('users')->where('id', $u->id)->update(['username' => $username]);
            });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropUnique(['google_id']);
            $table->dropUnique(['telegram_id']);
            $table->dropColumn(['username', 'google_id', 'telegram_id', 'avatar']);
        });
    }
};
