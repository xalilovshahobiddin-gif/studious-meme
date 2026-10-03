<?php

namespace App\Services;

use App\Models\Building;
use App\Models\GameConfig;
use App\Models\Player;
use App\Models\PlayerResource;
use Illuminate\Support\Facades\DB;

/**
 * Oʻyinchini Telegram foydalanuvchisidan topish/yaratish va holat snapshotini yigʻish.
 * v0.0.3: resurs hisobi (EconomyService) va qurilish navbati (BuildService); yurishlar hali yoʻq.
 */
class PlayerService
{
    public function __construct(private readonly EconomyService $economy) {}

    /**
     * Har autentifikatsiyalangan soʻrovning boshi: oʻyinchini topish va resurslarni hozirgacha hisoblash.
     * Chaqiruvchi DB::transaction ichida boʻlishi kerak (resurs qatori qulflanadi).
     *
     * @param  array<string, mixed>  $tgUser
     * @return array{0: Player, 1: array{away: array<string, mixed>|null, finished: list<array<string, mixed>>}}
     */
    public function enter(array $tgUser): array
    {
        $player = $this->forTelegramUser($tgUser);
        $sync = $this->economy->sync($player);

        return [$player, $sync];
    }

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
                // v0.4 gacha (tanishtiruv yoʻq): bepul tezlashtirishlar birinchi kirishda beriladi
                $player->free_speedups = (int) GameConfig::value('tutorial_free_speedups', 5);
            }

            $player->forceFill(['tg_username' => $tgUser['username'] ?? null])->save();
            PlayerResource::query()->firstOrCreate(['player_id' => $player->id], ['last_tick_at' => now()]);
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
                'free_speedups' => $player->free_speedups,
                'build_slots' => $player->buildSlots(),
            ],
            'resources' => $player->resources->toClient(),
            'buildings' => collect(Building::TYPES)->map(fn ($unlock, $type) => [
                'type' => $type,
                'level' => (int) ($levels[$type] ?? 0),
                'unlock_level' => $unlock,
                'locked' => $player->level < $unlock,
            ])->values()->all(),
            'economy' => $this->economy->clientState($player),
            'army' => [],
            'queues' => $this->queues($player),
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
            'economy' => $this->economy->clientState($player),
            'buildings' => $player->buildings()->pluck('level', 'type'),
            'queues' => $this->queues($player),
            'free_speedups' => $player->free_speedups,
            'server_time' => now()->format('Y-m-d\\TH:i:s.v\\Z'),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function queues(Player $player): array
    {
        return $player->queues()->where('state', 'running')->orderBy('ends_at')->get()
            ->map(fn ($q) => $q->toClient())->all();
    }
}
