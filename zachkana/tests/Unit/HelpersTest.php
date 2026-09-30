<?php

namespace Tests\Unit;

use App\Models\HistoryChapter;
use App\Models\User;
use PHPUnit\Framework\TestCase;

class HelpersTest extends TestCase
{
    public function test_phone_is_normalized_to_international_format(): void
    {
        $this->assertSame('998901234567', User::normalizePhone('+998 (90) 123-45-67'));
        $this->assertSame('998901234567', User::normalizePhone('90 123 45 67'));
    }

    public function test_history_body_is_split_into_paragraphs(): void
    {
        $chapter = new HistoryChapter(['body' => "Birinchi xatboshi.\n\n  Ikkinchi\nqator.\r\n\r\n\nUchinchi."]);

        $this->assertSame(['Birinchi xatboshi.', "Ikkinchi\nqator.", 'Uchinchi.'], $chapter->paragraphs());
    }
}
