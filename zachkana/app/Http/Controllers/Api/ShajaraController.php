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

class ShajaraController extends Controller
{
    public function tree(Request $request, Clan $clan): JsonResponse
    {
        $root = $clan->founder();
        $people = $clan->people()->get();

        return response()->json([
            'clan' => ['id' => $clan->slug, 'name' => $clan->name, 'count' => $people->count()],
            'tree' => $root ? Front::tree($people, $root, $request->user()?->id) : null,
        ]);
    }

    /** Qarindosh qoʻshish yoki mavjud maʼlumotni tuzatish taklifi. Moderator tasdiqlaydi. */
    public function suggest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['add', 'edit'])],
            'clan' => ['nullable', 'string', 'exists:clans,slug'],
            'person_id' => ['required_if:type,edit', 'nullable', 'integer', 'exists:people,id'],
            'parent_id' => ['nullable', 'integer', 'exists:people,id'],
            'name' => ['required_if:type,add', 'nullable', 'string', 'max:120'],
            'gender' => ['nullable', Rule::in(['m', 'f'])],
            'birth_year' => ['nullable', 'integer', 'between:1500,'.date('Y')],
            'death_year' => ['nullable', 'integer', 'between:1500,'.date('Y'), 'gte:birth_year'],
            'job' => ['nullable', 'string', 'max:120'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $parent = isset($data['parent_id']) ? Person::find($data['parent_id']) : null;
        $clanId = $parent?->clan_id ?? Clan::where('slug', $data['clan'] ?? null)->value('id');

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
        ]);

        return response()->json(['id' => $suggestion->id, 'status' => $suggestion->status], 201);
    }
}
