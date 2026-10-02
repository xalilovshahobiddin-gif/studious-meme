<?php

namespace Tests\Unit;

use App\Support\TelegramInitData;
use PHPUnit\Framework\TestCase;

class TelegramInitDataTest extends TestCase
{
    private const TOKEN = '123456:TEST-token';

    private function fields(array $overrides = []): array
    {
        return array_merge([
            'auth_date' => 1_800_000_000,
            'query_id' => 'AAH',
            'user' => json_encode(['id' => 42, 'first_name' => 'Alfa', 'language_code' => 'uz']),
        ], $overrides);
    }

    public function test_valid_init_data_returns_user(): void
    {
        $initData = TelegramInitData::sign($this->fields(), self::TOKEN);

        $result = TelegramInitData::validate($initData, self::TOKEN, 86400, 1_800_000_100);

        $this->assertSame(42, $result['user']['id']);
        $this->assertSame('Alfa', $result['user']['first_name']);
    }

    public function test_tampered_data_is_rejected(): void
    {
        $initData = TelegramInitData::sign($this->fields(), self::TOKEN);
        $tampered = str_replace('%22id%22%3A42', '%22id%22%3A43', $initData);

        $this->assertNotSame($initData, $tampered);
        $this->assertNull(TelegramInitData::validate($tampered, self::TOKEN, 86400, 1_800_000_100));
    }

    public function test_wrong_bot_token_is_rejected(): void
    {
        $initData = TelegramInitData::sign($this->fields(), self::TOKEN);

        $this->assertNull(TelegramInitData::validate($initData, '999:other', 86400, 1_800_000_100));
    }

    public function test_expired_init_data_is_rejected(): void
    {
        $initData = TelegramInitData::sign($this->fields(), self::TOKEN);

        $this->assertNull(TelegramInitData::validate($initData, self::TOKEN, 86400, 1_800_000_000 + 86401));
    }

    public function test_missing_hash_or_user_is_rejected(): void
    {
        $this->assertNull(TelegramInitData::validate('auth_date=1&user=%7B%7D', self::TOKEN, 86400));
        $noUser = TelegramInitData::sign(['auth_date' => 1_800_000_000], self::TOKEN);
        $this->assertNull(TelegramInitData::validate($noUser, self::TOKEN, 86400, 1_800_000_100));
        $this->assertNull(TelegramInitData::validate('', self::TOKEN, 86400));
        $this->assertNull(TelegramInitData::validate($noUser, '', 86400));
    }
}
