<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class PersonSuggestion extends Model
{
    protected $fillable = ['user_id', 'type', 'clan_id', 'person_id', 'parent_id', 'payload', 'comment', 'status', 'reviewed_by', 'reviewed_at', 'relation', 'lineage', 'tribe'];

    public const STATUSES = ['pending' => 'Kutilmoqda', 'approved' => 'Tasdiqlangan', 'rejected' => 'Rad etilgan'];

    public const FIELDS = ['name', 'gender', 'birth_year', 'death_year', 'job', 'bio'];

    protected function casts(): array
    {
        return ['payload' => 'array', 'reviewed_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function clan(): BelongsTo
    {
        return $this->belongsTo(Clan::class);
    }

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Person::class, 'parent_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /** Taklifni tasdiqlash: yangi odam qoʻshiladi yoki mavjudi yangilanadi. */
    public function approve(User $reviewer): Person
    {
        return DB::transaction(function () use ($reviewer) {
            $data = Arr::only($this->payload, self::FIELDS);

            $parent = $this->parent;
            if ($this->type === 'edit' && $this->person) {
                $person = tap($this->person)->update($data);
            } elseif ($parent && $this->relation === 'spouse') {
                $person = Person::create($data + ['clan_id' => $parent->clan_id, 'spouse_id' => $parent->id]);
            } elseif ($parent) {
                // Turmush oʻrtogʻining farzandi — shajarada qon qarindoshga (juftiga) bogʻlanadi
                $person = Person::create($data + ['clan_id' => $parent->clan_id, 'parent_id' => $parent->spouse_id ?? $parent->id]);
            } elseif ($this->clan_id && $this->relation !== 'root') {
                $person = Person::create($data + ['clan_id' => $this->clan_id]); // eski takliflar: avlod boshi
            } else {
                // Yangi avlod: shu odam bobokalon boʻladi
                $name = trim((string) $this->lineage) ?: $data['name'].' avlodi';
                $clan = Clan::create([
                    'name' => mb_substr($name, 0, 120),
                    'slug' => Clan::uniqueSlug($name),
                    'tribe' => $this->tribe,
                    'position' => (int) Clan::max('position') + 1,
                ]);
                $person = Person::create($data + ['clan_id' => $clan->id]);
                $this->clan_id = $clan->id;
            }

            $this->update(['status' => 'approved', 'reviewed_by' => $reviewer->id, 'reviewed_at' => now()]);
            UserNotification::send($this->user_id, 'suggestion', 'Taklifingiz tasdiqlandi',
                "“{$person->name}” shajaraga ".($this->type === 'edit' ? 'tuzatildi.' : 'qoʻshildi.'),
                '#/shajara/'.($person->clan?->slug ?? ''));

            return $person;
        });
    }

    public function reject(User $reviewer): void
    {
        $this->update(['status' => 'rejected', 'reviewed_by' => $reviewer->id, 'reviewed_at' => now()]);
        UserNotification::send($this->user_id, 'suggestion', 'Taklifingiz qabul qilinmadi',
            '“'.($this->payload['name'] ?? $this->person?->name ?? '').'” boʻyicha taklif moderator tomonidan rad etildi.', '#/shajara');
    }
}
