<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EconomyService;
use App\Services\PlayerService;
use App\Services\QuestService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Ustaxona: bufer yigʻish va taqsimot (docs/blue_wolf/blue_wolf_api.md, 3–4-boʻlimlar). */
class EconomyController extends Controller
{
    public function __construct(
        private readonly PlayerService $players,
        private readonly EconomyService $economy,
        private readonly QuestService $quests,
    ) {}

    /** POST /api/v1/buildings/collect — buf_* → ombor. */
    public function collect(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            [$player] = $this->players->enter($request->attributes->get('tg_user'));

            if ($player->buildings()->where('type', 'workshop')->doesntExist()) {
                return ApiResponse::error('BUILDING_LOCKED', 'Ustaxona qoyasi hali ochilmagan', 400);
            }
            $got = $this->economy->collect($player->resources);
            if (array_sum($got) > 0) {
                $this->quests->track($player, 'collect');
            }

            return ApiResponse::ok(['collected' => $got], $this->players->snapshot($player));
        });
    }

    /** POST /api/v1/profile/allocation — { stone, wood, hide, bone }, butun sonlar, yigʻindisi 100. */
    public function allocation(Request $request): JsonResponse
    {
        $alloc = [];
        foreach (EconomyService::BUILD as $k) {
            $v = $request->input($k);
            if (! is_int($v) || $v < 0 || $v > 100) {
                return ApiResponse::error('VALIDATION', 'Taqsimot notoʻgʻri', 422, ['field' => $k]);
            }
            $alloc[$k] = $v;
        }
        if (array_sum($alloc) !== 100) {
            return ApiResponse::error('VALIDATION', 'Taqsimot yigʻindisi 100 boʻlishi kerak', 422, ['sum' => array_sum($alloc)]);
        }

        return DB::transaction(function () use ($request, $alloc) {
            // Oldingi taqsimot boʻyicha hisob sync() da yopildi — yangisi shu paytdan amal qiladi
            [$player] = $this->players->enter($request->attributes->get('tg_user'));
            $res = $player->resources;
            foreach ($alloc as $k => $v) {
                $res->{'alloc_'.$k} = $v;
            }
            $res->save();

            return ApiResponse::ok(['allocation' => $alloc], $this->players->snapshot($player));
        });
    }
}
