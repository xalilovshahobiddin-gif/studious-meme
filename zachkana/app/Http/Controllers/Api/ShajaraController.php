<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clan;
use App\Models\Person;
use App\Models\PersonSuggestion;
use App\Support\Front;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ShajaraController extends Controller
{
    public function tree(Request $request, Clan $clan): JsonResponse
    {
        $root = $clan->founder();
        $people = $clan->people()->get();

        return response()->json([
            'clan' => ['id' => $clan->slug, 'name' => $clan->name, 'tribe' => $clan->tribe, 'count' => $people->count()],
            'tree' => $root ? Front::tree($people, $root, $request->user()?->id) : null,
        ]);
    }

    /**
     * Butun qishloq shajarasidan ism boʻyicha qidirish — odam qaysi avlodga
     * tegishli ekanini bilmasa ham qarindoshini topishi uchun.
     */
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q'));
        if (mb_strlen($q) < 2) {
            return response()->json(['people' => []]);
        }
        // Apostrof turlari (ʻ ' ‘ ’ ʼ) farq qilmasin: ular LIKE'da "istalgan bitta belgi" boʻladi
        // (% va _ olib tashlanadi — SQLite va MySQL'da LIKE ekranlash turlicha)
        $like = '%'.preg_replace("/[ʻʼ'‘’`]/u", '_', str_replace(['%', '_', '\\'], '', $q)).'%';

        $people = Person::with(['clan:id,slug,name,tribe', 'parent:id,name,gender', 'spouseOf:id,name'])
            ->where('name', 'like', $like)
            ->orderByRaw('birth_year is null')->orderBy('birth_year')
            ->limit(20)->get();

        return response()->json(['people' => $people->map(fn (Person $p) => [
            'id' => (string) $p->id,
            'name' => $p->name,
            'g' => $p->gender,
            'b' => $p->birth_year,
            'd' => $p->death_year,
            'clan' => $p->clan?->slug,
            'clanName' => $p->clan?->name,
            'tribe' => $p->clan?->tribe,
            'rel' => $p->spouseOf
                ? $p->spouseOf->name.'ning turmush oʻrtogʻi'
                : ($p->parent ? $p->parent->name.'ning '.($p->gender === 'f' ? 'qizi' : 'oʻgʻli') : 'Avlod boshi'),
            'isSpouse' => $p->spouse_id !== null,
        ])]);
    }

    /** Qarindosh qoʻshish yoki mavjud maʼlumotni tuzatish taklifi. Moderator tasdiqlaydi. */
    public function suggest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['add', 'edit'])],
            'clan' => ['nullable', 'string', 'exists:clans,slug'],
            'person_id' => ['required_if:type,edit', 'nullable', 'integer', 'exists:people,id'],
            'parent_id' => ['nullable', 'required_if:relation,child,spouse', 'integer', 'exists:people,id'],
            // Kimga nisbatan: farzandi | turmush oʻrtogʻi | yangi avlod boshi
            'relation' => ['nullable', Rule::in(['child', 'spouse', 'root'])],
            'lineage' => ['nullable', 'string', 'max:120'],
            'tribe' => ['nullable', 'string', 'max:60'],
            'name' => ['required_if:type,add', 'nullable', 'string', 'max:120'],
            'gender' => ['nullable', Rule::in(['m', 'f'])],
            'birth_year' => ['nullable', 'integer', 'between:1500,'.date('Y')],
            'death_year' => ['nullable', 'integer', 'between:1500,'.date('Y'), 'gte:birth_year'],
            'job' => ['nullable', 'string', 'max:120'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $relation = $data['type'] === 'add' ? ($data['relation'] ?? (isset($data['parent_id']) ? 'child' : 'root')) : null;
        $parent = $relation !== 'root' && isset($data['parent_id']) ? Person::find($data['parent_id']) : null;
        if ($relation === 'spouse' && $parent?->spouse_id) {
            throw ValidationException::withMessages(['parent_id' => 'Bu odam oʻzi turmush oʻrtogʻi sifatida kiritilgan — juftiga qoʻshing.']);
        }
        $clanId = $parent?->clan_id ?? ($relation === 'root' ? null : Clan::where('slug', $data['clan'] ?? null)->value('id'));

        $suggestion = PersonSuggestion::create([
            'user_id' => $request->user()->id,
            'type' => $data['type'],
            'clan_id' => $clanId,
            'person_id' => $data['person_id'] ?? null,
            'parent_id' => $parent?->id,
            'payload' => array_filter(
                array_intersect_key($data, array_flip(PersonSuggestion::FIELDS)),
                fn ($v) => $v !== null && $v !== ''
            ) + ['gender' => $data['gender'] ?? 'm'],
            'comment' => $data['comment'] ?? null,
            'status' => 'pending',
            'relation' => $relation,
            'lineage' => $relation === 'root' ? ($data['lineage'] ?? null) : null,
            'tribe' => $relation === 'root' ? ($data['tribe'] ?? null) : null,
        ]);

        return response()->json(['id' => $suggestion->id, 'status' => $suggestion->status], 201);
    }
}
