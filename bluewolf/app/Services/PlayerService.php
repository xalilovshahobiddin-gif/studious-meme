<?php

namespace App\Services;

use App\Models\Building;
use App\Models\Player;
use App\Models\PlayerResource;
use Illuminate\Support\Facades\DB;

/**
 * Oʻyinchini Telegram foydalanuvchisidan topish/yaratish va holat snapshotini yigʻish.
 * v0.0.x: resurs hisobi (accrual), navbatlar va yurishlar hali yoʻq — faqat skelet.
 */
class PlayerService
{
    /**
     * @param  array<string, mixed>  $tgUser
     */
    public function forTelegramUser(array $tgUser): Player
    {
        return DB::transaction(function () use ($tgUser) {
            $name = trim(($tgUser['first_name'] ?? '').' '.($tgUser['last_name'] ?? '')) ?: 'Boʻri';
            $lang = in_array($tgUser['language_code'] ?? '', ['uz', 'ru', 'en'], true) ? $tgUser['language_code'] : 'uz';

            $player = Player::query()->firstOrCreate(
                ['tg_id' => (int) $tgUser['id']],
                ['display_name' => mb_substr($name, 0, 48), 'lang' => $lang],
            );

            if ($player->wasRecentlyCreated) {
                $player->refresh(); // bazadagi standart qiymatlar (level = 1 va h.k.)
            }

            $player->forceFill([
                'tg_username' => $tgUser['username'] ?? null,
                'last_seen_at' => now(),
            ])->save();

            PlayerResource::query()->firstOrCreate(['player_id' => $player->id]);
            $this->syncBuildings($player);

            return $player->refresh();
        });
    }

    /**
     * Ochilgan binolar 1-darajada bepul paydo boʻladi; In darajasi oʻyinchi darajasiga teng (GDD bo'lim 5).
     */
    public function syncBuildings(Player $player): void
    {
        foreach (Building::TYPES as $type => $unlockLevel) {
            if ($player->level < $unlockLevel) {
                continue;
            }
            $building = Building::query()->firstOrCreate(['player_id' => $player->id, 'type' => $type], ['level' => 1]);
            if ($type === 'den' && $building->level !== $player->level) {
                $building->update(['level' => $player->level]);
            }
        }
    }

    /**
     * GET /state uchun toʻliq holat.
     *
     * @return array<string, mixed>
     */
    public function fullState(Player $player): array
    {
        $levels = $player->buildings()->pluck('level', 'type');

        return [
            'player' => [
                'id' => $player->id,
                'name' => $player->display_name,
                'username' => $player->tg_username,
                'lang' => $player->lang,
                'level' => $player->level,
                'xp' => $player->xp,
                'tutorial_step' => $player->tutorial_step,
            ],
            'resources' => $player->resources->toClient(),
            'buildings' => collect(Building::TYPES)->map(fn ($unlock, $type) => [
                'type' => $type,
                'level' => (int) ($levels[$type] ?? 0),
                'unlock_level' => $unlock,
                'locked' => $player->level < $unlock,
            ])->values()->all(),
            'army' => [],
            'queues' => [],
            'marches' => [],
            'shield_until' => null,
            'hunger' => false,
        ];
    }

    /**
     * Har javobga qoʻshiladigan qisqa snapshot.
     *
     * @return array<string, mixed>
     */
    public function snapshot(Player $player): array
    {
        return [
            'resources' => $player->resources->toClient(),
            'queues' => [],
            'server_time' => now()->toIso8601ZuluString(),
        ];
    }
}
