<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Oilaviy shajara: har bir foydalanuvchi oʻz daraxtini erkin tuzadi (moderatsiyasiz).
 * Daraxt faqat egasiga koʻrinadi. Aʼzoni qishloq shajarasiga taklif qilish — ShajaraController::suggest.
 */
class FamilyController extends Controller
{
    public const LIMIT = 500;

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'members' => FamilyMember::where('user_id', $request->user()->id)
                ->orderBy('position')->orderBy('birth_year')->orderBy('id')->get()
                ->map->toFront(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $this->validated($request) + $request->validate([
            'relation' => ['required', Rule::in(['root', 'child', 'spouse', 'parent'])],
            'of' => ['required_unless:relation,root', 'nullable', 'integer'],
        ]);
        if (FamilyMember::where('user_id', $user->id)->count() >= self::LIMIT) {
            throw ValidationException::withMessages(['name' => 'Shajarada '.self::LIMIT.' tadan ortiq odam boʻlishi mumkin emas.']);
        }

        $of = isset($data['of']) ? FamilyMember::where('user_id', $user->id)->findOrFail($data['of']) : null;
        $fields = collect($data)->only(['name', 'gender', 'birth_year', 'death_year', 'job', 'bio', 'is_me'])->all();

        $member = DB::transaction(function () use ($data, $of, $user, $fields) {
            $attrs = $fields + ['user_id' => $user->id];

            switch ($data['relation']) {
                case 'child':
                    // Kelin/kuyovga farzand qoʻshilsa — farzand juftlikning oʻz aʼzosiga bogʻlanadi
                    $attrs['parent_id'] = $of->spouse_id ?? $of->id;
                    break;
                case 'spouse':
                    if ($of->spouse_id) {
                        throw ValidationException::withMessages(['of' => 'Turmush oʻrtogʻini daraxtdagi asosiy aʼzoga qoʻshing.']);
                    }
                    $attrs['spouse_id'] = $of->id;
                    break;
                case 'parent':
                    if ($of->parent_id || $of->spouse_id) {
                        throw ValidationException::withMessages(['of' => 'Bu odamning ota-onasi allaqachon koʻrsatilgan.']);
                    }
                    break;
            }

            $member = FamilyMember::create($attrs);
            if ($data['relation'] === 'parent') {
                $of->update(['parent_id' => $member->id]);
            }
            $this->syncMe($member);

            return $member;
        });

        return response()->json(['member' => $member->toFront()], 201);
    }

    /** Surat yuklash (brauzer oldindan kichraytirib yuboradi) yoki oʻchirish (photo yuborilmasa). */
    public function photo(Request $request, FamilyMember $member): JsonResponse
    {
        abort_unless($member->user_id === $request->user()->id, 404);
        $request->validate(['photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096']]);

        $old = $member->photo;
        $member->update(['photo' => $request->file('photo')?->store('family/'.$member->user_id, 'public')]);
        if ($old) {
            Storage::disk('public')->delete($old);
        }

        return response()->json(['member' => $member->toFront()]);
    }

    public function update(Request $request, FamilyMember $member): JsonResponse
    {
        abort_unless($member->user_id === $request->user()->id, 404);
        $member->update($this->validated($request));
        $this->syncMe($member);

        return response()->json(['member' => $member->fresh()->toFront()]);
    }

    public function destroy(Request $request, FamilyMember $member): JsonResponse
    {
        abort_unless($member->user_id === $request->user()->id, 404);
        // Turmush oʻrtoqlari ham oʻchadi (cascade), farzandlari esa alohida shox boʻlib qoladi
        $photos = $member->spouses()->pluck('photo')->push($member->photo)->filter()->all();
        $member->delete();
        Storage::disk('public')->delete($photos);

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'gender' => ['required', Rule::in(['m', 'f'])],
            'birth_year' => ['nullable', 'integer', 'between:1500,'.date('Y')],
            'death_year' => ['nullable', 'integer', 'between:1500,'.date('Y'), 'gte:birth_year'],
            'job' => ['nullable', 'string', 'max:120'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'is_me' => ['nullable', 'boolean'],
        ]) + ['birth_year' => null, 'death_year' => null, 'job' => null, 'bio' => null, 'is_me' => false];
    }

    /** "Bu men" belgisi faqat bitta aʼzoda boʻladi */
    private function syncMe(FamilyMember $member): void
    {
        if ($member->is_me) {
            FamilyMember::where('user_id', $member->user_id)->whereKeyNot($member->id)->update(['is_me' => false]);
        }
    }
}
