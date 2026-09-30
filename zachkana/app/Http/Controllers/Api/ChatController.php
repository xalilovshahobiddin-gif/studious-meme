<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Models\Message;
use App\Models\User;
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
        $q = $channel->messages()->with('user:id,name');

        $messages = $after > 0
            ? $q->where('id', '>', $after)->orderBy('id')->limit(100)->get()
            : $q->latest('id')->limit(50)->get()->reverse()->values();

        return response()->json([
            'messages' => $messages->map(fn (Message $m) => Front::message($m, $request->user()->id)),
            'can_post' => $channel->canPost($request->user()),
        ]);
    }

    public function store(Request $request, Channel $channel): JsonResponse
    {
        abort_unless($channel->canPost($request->user()), 403, 'Bu kanalda faqat moderatorlar yoza oladi.');
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $message = $channel->messages()->create([
            'user_id' => $request->user()->id,
            'body' => trim($data['body']),
        ])->load('user:id,name');

        return response()->json(['message' => Front::message($message, $request->user()->id)], 201);
    }
}
