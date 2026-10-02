<?php
declare(strict_types=1);

namespace BlueWolf;

/** API xatosi — javob konvertiga aylanadi (API bo'lim 2). */
final class ApiError extends \RuntimeException
{
    private const HTTP = [
        'UNAUTHORIZED' => 401, 'BANNED' => 403, 'NOT_FOUND' => 404, 'BAD_REQUEST' => 400,
        'NOT_ENOUGH_RESOURCES' => 400, 'LEVEL_TOO_LOW' => 400, 'BUILDING_TOO_LOW' => 400,
        'QUEUE_BUSY' => 409, 'CAPACITY_FULL' => 400, 'TIER_LOCKED' => 400,
        'OUT_OF_WINDOW' => 400, 'TARGET_SHIELDED' => 400, 'PAIR_LIMIT' => 429,
        'ON_VACATION' => 400, 'SPEEDUP_CAP' => 429, 'WAR_ACTIVE' => 409,
        'RATE_LIMITED' => 429, 'VERSION_OUTDATED' => 426, 'DEN_AUTO_LEVEL' => 400,
        'NOT_ENOUGH_ARMY' => 400, 'COOLDOWN' => 429, 'TUTORIAL_ORDER' => 400,
        'TUTORIAL_CHECK' => 400, 'REQUEST_ID_REQUIRED' => 400, 'NOT_IN_MVP' => 501,
    ];

    public function __construct(
        public readonly string $errCode,
        string $message = '',
        public readonly array $details = [],
    ) {
        parent::__construct($message !== '' ? $message : $errCode);
    }

    public function http(): int
    {
        return self::HTTP[$this->errCode] ?? 400;
    }
}
