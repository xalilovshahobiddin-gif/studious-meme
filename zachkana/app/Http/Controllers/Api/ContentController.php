<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistoryChapter;
use App\Models\Submission;
use App\Models\TimelineEvent;
use App\Models\Veteran;
use App\Support\Front;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContentController extends Controller
{
    public function history(): JsonResponse
    {
        return response()->json(HistoryChapter::orderBy('position')->get()->map(fn (HistoryChapter $c) => [
            'id' => $c->slug,
            'title' => $c->title,
            'paras' => $c->paragraphs(),
            'quote' => $c->quote_text ? ['text' => $c->quote_text, 'cite' => $c->quote_cite] : null,
        ]));
    }

    public function timeline(): JsonResponse
    {
        $events = TimelineEvent::orderBy('position')->orderBy('sort_year')->get();
        $eras = collect(TimelineEvent::ERAS)->merge($events->pluck('era'))->unique()
            ->filter(fn ($e) => $events->contains('era', $e))->values();

        return response()->json([
            'eras' => $eras->prepend('Barchasi')->values(),
            'events' => $events->map(fn (TimelineEvent $e) => [
                'era' => $e->era, 'year' => $e->year_label, 'title' => $e->title,
                'text' => $e->body, 'icon' => $e->icon, 'major' => $e->is_major,
            ]),
        ]);
    }

    public function veterans(): JsonResponse
    {
        return response()->json([
            'categories' => collect(['all' => 'Barchasi'] + Veteran::CATEGORIES)->map(fn ($name, $id) => ['id' => $id, 'name' => $name])->values(),
            'veterans' => Veteran::orderBy('position')->orderBy('name')->get()->map(fn ($v) => Front::veteran($v)),
        ]);
    }

    public function veteran(Veteran $veteran): JsonResponse
    {
        return response()->json(Front::veteran($veteran->load('approvedMemories'), true));
    }

    public function storeMemory(Request $request, Veteran $veteran): JsonResponse
    {
        $data = $request->validate([
            'author_name' => ['nullable', 'string', 'max:80'],
            'body' => ['required', 'string', 'min:3', 'max:3000'],
        ]);
        $memory = $veteran->memories()->create([
            'user_id' => $request->user()->id,
            'author_name' => ($data['author_name'] ?? null) ?: $request->user()->name,
            'body' => $data['body'],
            'status' => $request->user()->isStaff() ? 'approved' : 'pending',
        ]);

        return response()->json(['id' => $memory->id, 'status' => $memory->status], 201);
    }

    /** Tarix uchun material yoki faxriy taklifi (ixtiyoriy fayl bilan). */
    public function storeSubmission(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(Submission::TYPES))],
            'author_name' => ['nullable', 'string', 'max:80'],
            'subject' => ['nullable', 'string', 'max:160'],
            'category' => ['nullable', 'string', 'max:60'],
            'body' => ['required', 'string', 'min:3', 'max:5000'],
            'attachment' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240'],
        ]);
        $path = $request->file('attachment')?->store('submissions', 'public');

        $s = Submission::create([
            'user_id' => $request->user()->id,
            'attachment' => $path,
        ] + collect($data)->except('attachment')->all());

        return response()->json(['id' => $s->id], 201);
    }
}
