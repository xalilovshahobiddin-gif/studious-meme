<?php

namespace App\Services;

use RuntimeException;

/** Oʻyin qoidasi buzilganda — API xato konvertiga aylanadi (bootstrap/app.php). */
class GameException extends RuntimeException
{
    /** @param  array<string, mixed>  $details */
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 400,
        public readonly array $details = [],
    ) {
        parent::__construct($message);
    }
}
