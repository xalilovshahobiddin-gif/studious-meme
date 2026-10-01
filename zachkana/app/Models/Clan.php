<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Clan extends Model
{
    protected $fillable = ['slug', 'name', 'description', 'position', 'tribe'];

    /** Qishloqlarda koʻp uchraydigan urugʻlar — admin panelda va taklif formasida maslahat sifatida */
    public const TRIBES = ['Qovchin', 'Barlos', 'Xoʻja', 'Sayyid', 'Qoʻngʻirot', 'Mangʻit', 'Qipchoq', 'Nayman', 'Saroy', 'Kenagas', 'Yuz', 'Ming', 'Qarluq', 'Laqay', 'Turk', 'Qatagʻon', 'Durmon', 'Uyshun', 'Joʻyut', 'Moʻgʻul', 'Arab', 'Tojik'];

    /** Yangi avlod uchun URL nomi: "Karimberdi ota avlodi" → karimberdi-ota-avlodi(-2) */
    public static function uniqueSlug(string $name): string
    {
        $base = Str::slug(str_replace(['ʻ', 'ʼ', "'", '‘', '’'], '', $name)) ?: 'avlod';
        $base = mb_substr($base, 0, 56);
        $slug = $base;
        for ($i = 2; static::where('slug', $slug)->exists(); $i++) {
            $slug = "$base-$i";
        }

        return $slug;
    }

    public function people(): HasMany
    {
        return $this->hasMany(Person::class);
    }

    /** Avlod boshi (bobokalon): ota-onasi ham, turmush oʻrtogʻi ham koʻrsatilmagan birinchi odam. */
    public function founder(): ?Person
    {
        return $this->people()->whereNull('parent_id')->whereNull('spouse_id')->orderBy('position')->orderBy('id')->first();
    }
}
