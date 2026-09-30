<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Models\Message;
use App\Models\User;
use App\Models\UserNotification;
use App\Support\Front;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Qishloq suhbati. Frontend yangi xabarlarni ?after=<oxirgi id> bilan har bir necha
 * soniyada soʻraydi — oddiy (shared) hostingda ham ishlaydi, WebSocket server shart emas.
 */
class ChatController extends Controller
{
    public static function channelList(?User $user): array
    {
        $members = User::count();

        return Channel::orderBy('position')->get()->map(function (Channel $c) use ($user, $members) {
            $last = $user ? $c->messages()->with('user:id,name')->latest('id')->first() : null;

            return [
                'id' => $c->slug,
                'name' => $c->name,
                'icon' => $c->icon,
                'desc' => $c->description,
                'readonly' => $c->is_readonly,
                'members' => $members,
                'last' => $last ? Front::message($last, $user?->id) : null,
            ];
        })->all();
    }

    public function messages(Request $request, Channel $channel): JsonResponse
    {
        $after = (int) $request->query('after', 0);
        $q = $channel->messages()->with(['user:id,name', 'replyTo.user:id,name']);

        $messages = $after > 0
            ? $q->where('id', '>', $after)->orderBy('id')->limit(100)->get()
            : $q->latest('id')->limit(50)->get()->reverse()->values();

        return response()->json([
            'messages' => $messages->map(fn (Message $m) => Front::message($m, $request->user()->id)),
            // Yaqinda oʻchirilganlar — boshqa foydalanuvchilar ekranidan ham olib tashlash uchun
            'deleted' => $after > 0
                ? $channel->messages()->onlyTrashed()->where('deleted_at', '>=', now()->subMinutes(10))->pluck('id')
                : [],
            'can_post' => $channel->canPost($request->user()),
            'can_delete' => $request->user()->isStaff(),
        ]);
    }

    public function store(Request $request, Channel $channel): JsonResponse
    {
        abort_unless($channel->canPost($request->user()), 403, 'Bu kanalda faqat moderatorlar yoza oladi.');
        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'reply_to_id' => ['nullable', 'integer'],
        ]);

        // Faqat shu kanaldagi mavjud xabarga javob berish mumkin
        $replyTo = isset($data['reply_to_id']) ? $channel->messages()->find($data['reply_to_id']) : null;

        $message = $channel->messages()->create([
            'user_id' => $request->user()->id,
            'reply_to_id' => $replyTo?->id,
            'body' => trim($data['body']),
        ])->load(['user:id,name', 'replyTo.user:id,name']);

        if ($replyTo && $replyTo->user_id !== $request->user()->id) {
            UserNotification::send(
                $replyTo->user_id, 'reply',
                $request->user()->name.' sizga javob berdi',
                mb_strimwidth($message->body, 0, 120, '…'),
                "#/chat/{$channel->slug}/{$message->id}",
            );
        }

        return response()->json(['message' => Front::message($message, $request->user()->id)], 201);
    }

    /** Xabarni oʻchirish — faqat moderator va administrator. */
    public function destroy(Request $request, Channel $channel, Message $message): JsonResponse
    {
        abort_unless($request->user()->isStaff(), 403, 'Xabarni faqat moderator oʻchira oladi.');
        abort_unless($message->channel_id === $channel->id, 404);
        $message->delete();

        return response()->json(['deleted' => $message->id]);
    }
}
