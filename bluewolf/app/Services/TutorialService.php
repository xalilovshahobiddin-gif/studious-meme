<?php

namespace App\Services;

use App\Models\GameConfig;
use App\Models\Player;

/**
 * Tanishtiruv (GDD bo'lim 15): 23 qadam, jami 330 XP — oʻyinchi 5-darajaga chiqadi.
 * Qadamlar public/data/tutorial.json da (klient ham shuni oʻqiydi).
 * Tanishtiruv davomida: XP faqat qadamlardan, qurilish va mashq navbatlari darhol tugaydi.
 */
class TutorialService
{
    /** @var array{skip_from: int, steps: list<array<string, mixed>>}|null */
    private static ?array $data = null;

    /** @return array{skip_from: int, steps: list<array<string, mixed>>} */
    public static function data(): array
    {
        return self::$data ??= json_decode((string) file_get_contents(public_path('data/tutorial.json')), true, flags: JSON_THROW_ON_ERROR);
    }

    public static function total(): int
    {
        return count(self::data()['steps']);
    }

    public static function active(Player $player): bool
    {
        return $player->tutorial_step < self::total();
    }

    public function __construct(
        private readonly ProgressService $progress,
        private readonly ArmyService $army,
    ) {}

    /**
     * Navbatdagi qadamni yakunlash: XP va mukofot beriladi. Qadamlar faqat ketma-ket.
     *
     * @return array{step: int, xp: int, reward: array<string, mixed>, levels: list<int>}
     */
    public function complete(Player $player, int $step): array
    {
        if (! self::active($player)) {
            throw new GameException('VALIDATION', 'Tanishtiruv tugagan', 422);
        }
        if ($step !== $player->tutorial_step + 1) {
            throw new GameException('VALIDATION', 'Qadamlar ketma-ket bajariladi', 422, ['expected' => $player->tutorial_step + 1]);
        }
        $def = self::data()['steps'][$step - 1];
        $player->tutorial_step = $step;
        $player->save();
        $reward = $def['reward'] ?? [];
        $this->grant($player, $reward);
        $levels = $this->progress->addXp($player, $def['xp'], true);

        return ['step' => $step, 'xp' => $def['xp'], 'reward' => $reward, 'levels' => $levels];
    }

    /**
     * Oʻtkazib yuborish (skip_from-qadamdan keyin): qolgan qadamlarning XP si beriladi, resurs mukofotlari — yoʻq.
     *
     * @return array{xp: int, levels: list<int>}
     */
    public function skip(Player $player): array
    {
        $data = self::data();
        if (! self::active($player)) {
            throw new GameException('VALIDATION', 'Tanishtiruv tugagan', 422);
        }
        if ($player->tutorial_step < $data['skip_from']) {
            throw new GameException('VALIDATION', 'Oʻtkazib yuborish '.$data['skip_from'].'-qadamdan keyin', 422);
        }
        $xp = array_sum(array_column(array_slice($data['steps'], $player->tutorial_step), 'xp'));
        $player->tutorial_step = self::total();
        $player->save();

        return ['xp' => $xp, 'levels' => $this->progress->addXp($player, $xp, true)];
    }

    /** @param  array<string, mixed>  $reward */
    private function grant(Player $player, array $reward): void
    {
        if (! $reward) {
            return;
        }
        $res = $player->resources;
        foreach ($reward as $k => $v) {
            if ($k === 'meat') {
                $cave = (int) ($player->buildings()->where('type', 'food_cave')->value('level') ?? 0);
                $cap = EconomyService::caveCap(GameConfig::allValues(), $cave);
                $res->meat = max((float) $res->meat, min($cap, (float) $res->meat + $v));
            } elseif ($k === 'buf') {
                foreach ($v as $bk => $bv) {
                    $res->{'buf_'.$bk} = (float) $res->{'buf_'.$bk} + $bv;
                }
            } elseif ($k === 'army') {
                foreach ($v as $role => $qty) {
                    $this->army->add($player, $role, 1, (int) $qty);
                }
            } else {
                $res->{$k} = (float) $res->{$k} + $v;
            }
        }
        $res->save();
    }
}
