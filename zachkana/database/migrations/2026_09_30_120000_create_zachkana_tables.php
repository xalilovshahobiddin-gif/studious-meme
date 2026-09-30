<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Qishloq sozlamalari (aholi soni, xonadonlar va h.k.)
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 64)->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Shajara: urugʻlar
        Schema::create('clans', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        // Shajara: odamlar. parent_id — urugʻ chizigʻidagi ota/ona,
        // spouse_id — urugʻ aʼzosiga turmushga chiqqan (kelin/kuyov) boʻlsa, oʻsha aʼzo.
        Schema::create('people', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('people')->nullOnDelete();
            $table->foreignId('spouse_id')->nullable()->constrained('people')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->char('gender', 1); // m | f
            $table->unsignedSmallInteger('birth_year')->nullable();
            $table->unsignedSmallInteger('death_year')->nullable();
            $table->string('job')->nullable();
            $table->text('bio')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->index(['clan_id', 'parent_id']);
        });

        // Shajaraga qoʻshish/tuzatish takliflari (moderator tasdiqlaydi)
        Schema::create('person_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10); // add | edit
            $table->foreignId('clan_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('person_id')->nullable()->constrained('people')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('people')->nullOnDelete();
            $table->json('payload');
            $table->text('comment')->nullable();
            $table->string('status', 10)->default('pending'); // pending | approved | rejected
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index('status');
        });

        Schema::create('history_chapters', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('title');
            $table->longText('body'); // xatboshilar boʻsh qator bilan ajratiladi
            $table->text('quote_text')->nullable();
            $table->string('quote_cite')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('timeline_events', function (Blueprint $table) {
            $table->id();
            $table->string('era', 64);
            $table->string('year_label', 64);
            $table->unsignedSmallInteger('sort_year')->nullable();
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('icon', 32)->default('flag');
            $table->boolean('is_major')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('veterans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('person_id')->nullable()->constrained('people')->nullOnDelete();
            $table->string('name');
            $table->string('category', 20); // urush | mehnat | ustoz | shifokor
            $table->string('title');
            $table->unsignedSmallInteger('birth_year')->nullable();
            $table->unsignedSmallInteger('death_year')->nullable();
            $table->json('medals')->nullable();
            $table->string('short')->nullable();
            $table->longText('bio')->nullable();
            $table->text('quote')->nullable();
            $table->string('photo')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('memories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('veteran_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('author_name');
            $table->text('body');
            $table->string('status', 10)->default('pending');
            $table->timestamps();
            $table->index(['veteran_id', 'status']);
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('type', 16); // elon | yangilik | marosim
            $table->string('title');
            $table->text('body');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->index('published_at');
        });

        // Tarix materiallari va faxriy takliflari
        Schema::create('submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 16); // history | veteran
            $table->string('author_name')->nullable();
            $table->string('subject')->nullable();
            $table->string('category')->nullable();
            $table->text('body');
            $table->string('attachment')->nullable();
            $table->string('status', 10)->default('pending'); // pending | reviewed
            $table->timestamps();
        });

        Schema::create('channels', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name');
            $table->string('icon', 32)->default('hash');
            $table->string('description')->nullable();
            $table->boolean('is_readonly')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('channel_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['channel_id', 'id']);
        });
    }

    public function down(): void
    {
        foreach (['messages', 'channels', 'submissions', 'announcements', 'memories', 'veterans',
            'timeline_events', 'history_chapters', 'person_suggestions', 'people', 'clans', 'settings'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
