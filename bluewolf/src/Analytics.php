<?php
declare(strict_types=1);

namespace BlueWolf;

/** Analitika hodisalari (D1/D7, tanishtiruv tugatish, birinchi jang...). */
final class Analytics
{
    public static function log(?int $pid, string $event, array $payload): void
    {
        Db::insert('analytics_events', ['player_id' => $pid, 'event' => mb_substr($event, 0, 48),
            'payload' => json_encode($payload)]);
    }
}
