<?php

namespace App\Support;

use App\Models\Announcement;
use App\Models\Message;
use App\Models\Person;
use App\Models\Veteran;
use Illuminate\Support\Collection;

/**
 * Modellarni frontend (public/js/app.js) kutgan koʻrinishga oʻtkazadi.
 * Maydon nomlari namuna maʼlumotlar (public/js/data.js) bilan bir xil.
 */
class Front
{
    private const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

    public static function date(\DateTimeInterface $d): string
    {
        return $d->format('j').'-'.self::MONTHS[(int) $d->format('n') - 1];
    }

    public static function person(Person $p, ?int $meId = null): array
    {
        return array_filter([
            'id' => (string) $p->id,
            'name' => $p->name,
            'g' => $p->gender,
            'b' => $p->birth_year,
            'd' => $p->death_year,
            'job' => $p->job,
            'bio' => $p->bio,
            'me' => $meId && $p->user_id === $meId ? true : null,
            'photo' => $p->photo ? asset('storage/'.$p->photo) : null,
        ], fn ($v) => $v !== null && $v !== '');
    }

    /**
     * Avlod daraxti: barcha aʼzolar bitta soʻrovda olinadi va xotirada ichma-ich tuziladi.
     *
     * @param  Collection<int, Person>  $people
     */
    public static function tree(Collection $people, Person $root, ?int $meId = null): array
    {
        $byParent = $people->whereNotNull('parent_id')->groupBy('parent_id');
        $spouses = $people->whereNotNull('spouse_id')->groupBy('spouse_id');

        $build = function (Person $p, int $depth = 0) use (&$build, $byParent, $spouses, $meId): array {
            $node = self::person($p, $meId);
            if ($s = $spouses->get($p->id)?->first()) {
                $node['spouse'] = self::person($s, $meId);
            }
            // Aylanma bogʻlanishdan himoya (notoʻgʻri kiritilgan maʼlumot)
            $kids = $depth < 30 ? ($byParent->get($p->id) ?? collect()) : collect();
            if ($kids->isNotEmpty()) {
                $node['children'] = $kids
                    ->sortBy([['position', 'asc'], ['birth_year', 'asc'], ['id', 'asc']])
                    ->map(fn (Person $c) => $build($c, $depth + 1))
                    ->values()->all();
            }

            return $node;
        };

        return $build($root);
    }

    public static function announcement(Announcement $a): array
    {
        return [
            'id' => $a->id,
            'type' => Announcement::TYPES[$a->type] ?? $a->type,
            'tone' => Announcement::TONES[$a->type] ?? 'primary',
            'date' => self::date($a->published_at ?? $a->created_at),
            'at' => ($a->published_at ?? $a->created_at)->toIso8601String(),
            'title' => $a->title,
            'text' => $a->body,
        ];
    }

    public static function veteran(Veteran $v, bool $full = false): array
    {
        $data = [
            'id' => (string) $v->id,
            'name' => $v->name,
            'b' => $v->birth_year,
            'd' => $v->death_year,
            'cat' => $v->category,
            'title' => $v->title,
            'medals' => $v->medals ?? [],
            'short' => $v->short,
            'quote' => $v->quote,
            'photo' => $v->photo ? asset('storage/'.$v->photo) : null,
        ];
        if ($full) {
            $data['bio'] = $v->bio;
            $data['memories'] = $v->approvedMemories->map(fn ($m) => [
                'a' => $m->author_name,
                't' => $m->created_at->diffForHumans(),
                'text' => $m->body,
            ])->all();
        }

        return $data;
    }

    public static function message(Message $m, ?int $meId = null): array
    {
        return [
            'id' => $m->id,
            'a' => $m->user?->name ?? 'Nomaʼlum',
            't' => $m->created_at->format('H:i'),
            'day' => $m->created_at->toDateString(),
            'text' => $m->body,
            'me' => $meId !== null && $m->user_id === $meId,
            'reply' => $m->reply_to_id ? [
                'id' => $m->reply_to_id,
                'a' => $m->replyTo?->user?->name ?? 'Nomaʼlum',
                'text' => $m->replyTo?->trashed() ? 'Xabar oʻchirilgan' : mb_strimwidth((string) $m->replyTo?->body, 0, 90, '…'),
            ] : null,
            'reactions' => $m->reactionSummary($meId),
        ];
    }
}
