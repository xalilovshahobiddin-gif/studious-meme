<?php

namespace Tests\Unit;

use App\Services\EconomyService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** Klientdagi BWGame.advance bilan bir xil holatlar: tests/fixtures/economy_cases.json */
class EconomyServiceTest extends TestCase
{
    /** @return array<string, array{0: array<string, mixed>}> */
    public static function cases(): array
    {
        $data = json_decode(file_get_contents(__DIR__.'/../fixtures/economy_cases.json'), true);
        $out = [];
        foreach ($data['cases'] as $case) {
            $out[$case['name']] = [$case];
        }

        return $out;
    }

    /** @return array<string, float> */
    private static function config(): array
    {
        return json_decode(file_get_contents(__DIR__.'/../../public/data/game_config.json'), true);
    }

    /** @param  array<string, mixed>  $case */
    #[DataProvider('cases')]
    public function test_advance_matches_shared_cases(array $case): void
    {
        $out = EconomyService::advance(self::config(), $case['input'], (float) $case['t1']);

        foreach (['res', 'buf'] as $group) {
            foreach ($case['expect'][$group] ?? [] as $key => $value) {
                $this->assertEqualsWithDelta($value, $out[$group][$key], 1e-6, "{$group}.{$key}");
            }
        }
        $this->assertSame((float) $case['t1'], (float) $out['last_tick']);
    }

    public function test_no_time_passed_changes_nothing(): void
    {
        $e = ['res' => ['meat' => 1.0, 'water' => 2.0], 'buf' => ['stone' => 3.0], 'last_tick' => 5000, 'last_seen' => 0];
        $this->assertSame($e, EconomyService::advance(self::config(), $e, 5000));
        $this->assertSame($e, EconomyService::advance(self::config(), $e, 4000));
    }
}
