<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\User;
use App\Models\UserNotification;
use App\Support\Front;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Qoʻngʻiroqcha (bildirishnomalar): shaxsiy bildirishnomalar + eʼlonlar.
 * Har bir element "url" ga ega — bosilganda manbasiga oʻtiladi.
 */
class NotificationController extends Controller
{
    public static function unreadCount(?User $user): int
    {
        if (! $user) {
            return 0;
        }

        return $user->hasMany(UserNotification::class)->whereNull('read_at')->count()
            + Announcement::published()->when($user->notifications_seen_at, fn ($q, $t) => $q->where('published_at', '>', $t))->count();
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $seen = $user?->notifications_seen_at;

        $items = Announcement::published()->latest('published_at')->limit(15)->get()->map(fn (Announcement $a) => [
            'id' => 'a'.$a->id,
            'kind' => 'announcement',
            'icon' => ['elon' => 'megaphone', 'marosim' => 'heart'][$a->type] ?? 'bell',
            'label' => Announcement::TYPES[$a->type] ?? 'Eʼlon',
            'title' => $a->title,
            'text' => mb_strimwidth($a->body, 0, 140, '…'),
            'url' => '#/elonlar/'.$a->id,
            'at' => $a->published_at->toIso8601String(),
            'date' => Front::date($a->published_at),
            'unread' => $user ? (! $seen || $a->published_at->gt($seen)) : null,
        ]);

        if ($user) {
            $personal = UserNotification::where('user_id', $user->id)->latest()->limit(30)->get()->map(fn (UserNotification $n) => [
                'id' => 'n'.$n->id,
                'kind' => $n->type,
                'icon' => ['reply' => 'chat', 'suggestion' => 'shajara', 'memory' => 'heart'][$n->type] ?? 'bell',
                'label' => ['reply' => 'Javob', 'suggestion' => 'Shajara', 'memory' => 'Xotira'][$n->type] ?? 'Xabar',
                'title' => $n->title,
                'text' => $n->body,
                'url' => $n->url,
                'at' => $n->created_at->toIso8601String(),
                'date' => $n->created_at->diffForHumans(),
                'unread' => $n->read_at === null,
            ]);
            $items = $items->concat($personal);
        }

        return response()->json([
            'items' => $items->sortByDesc('at')->values(),
            'unread' => self::unreadCount($user),
        ]);
    }

    /** Qoʻngʻiroqchadagi son — sayt ochiq turganda davriy soʻraladi */
    public function unread(Request $request): JsonResponse
    {
        return response()->json(['unread' => self::unreadCount($request->user())]);
    }

    /** Bitta bildirishnomani (id: n12 / a5) yoki hammasini (id yoʻq) oʻqilgan deb belgilash. */
    public function read(Request $request): JsonResponse
    {
        $user = $request->user();
        $id = (string) $request->input('id', '');

        if (str_starts_with($id, 'n')) {
            UserNotification::where('user_id', $user->id)->whereKey((int) substr($id, 1))->update(['read_at' => now()]);
        } elseif ($id === '') {
            UserNotification::where('user_id', $user->id)->whereNull('read_at')->update(['read_at' => now()]);
            $user->forceFill(['notifications_seen_at' => now()])->save();
        }

        return response()->json(['unread' => self::unreadCount($user->fresh())]);
    }

    public function announcements(): JsonResponse
    {
        return response()->json(Announcement::published()->latest('published_at')->limit(50)->get()->map(fn ($a) => Front::announcement($a) + ['body' => $a->body]));
    }

    public function announcement(Announcement $announcement): JsonResponse
    {
        abort_unless($announcement->published_at && $announcement->published_at->lte(now()), 404);

        return response()->json(Front::announcement($announcement) + ['body' => $announcement->body]);
    }
}
