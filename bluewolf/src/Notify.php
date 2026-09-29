<?php
declare(strict_types=1);

namespace BlueWolf;

/**
 * Telegram bildirishnomalari (texnik spec bo'lim 2).
 * Navbatga yoziladi, cron yuboradi: kuniga ≤6 (1-ustuvorlik byudjetdan tashqari),
 * tunda (23:00–08:00) faqat 1-ustuvorlik.
 */
final class Notify
{
    public static function push(int $pid, string $type, array $payload, int $priority): void
    {
        Db::insert('notifications', [
            'player_id' => $pid, 'type' => $type, 'payload' => json_encode($payload + ['_p' => $priority]),
            'channel' => 'telegram', 'scheduled_at' => Db::dt(time()),
        ]);
    }

    public static function sendDue(int $now): int
    {
        $env = \bw_env();
        $rows = Db::all("SELECT n.*, p.tg_id, p.lang, p.is_bot FROM notifications n JOIN players p ON p.id = n.player_id
                         WHERE n.state = 'queued' AND n.scheduled_at <= ? ORDER BY n.id LIMIT 200", [Db::dt($now)]);
        $sent = 0;
        $hour = (int) gmdate('G', $now + (int) round(Config::get('notify_tz_offset_h') * 3600));
        $night = $hour >= Config::int('notify_night_from') || $hour < Config::int('notify_night_to');
        foreach ($rows as $n) {
            $payload = json_decode((string) $n['payload'], true) ?: [];
            $prio = (int) ($payload['_p'] ?? 3);
            $day = gmdate('Y-m-d', $now);
            $count = (int) (Db::val('SELECT sent_count FROM notification_budget WHERE player_id = ? AND budget_date = ?',
                [$n['player_id'], $day]) ?? 0);
            $skip = (int) $n['is_bot'] === 1 || $env['bot_token'] === ''
                || ($prio > 1 && ($night || $count >= Config::int('notify_daily_budget')));
            if ($skip) {
                Db::exec("UPDATE notifications SET state = 'skipped' WHERE id = ?", [$n['id']]);
                continue;
            }
            $ok = self::telegram((int) $n['tg_id'], self::text($n['type'], $payload, $n['lang']), $env);
            Db::exec('UPDATE notifications SET state = ?, sent_at = ? WHERE id = ?', [$ok ? 'sent' : 'failed', Db::dt($now), $n['id']]);
            if ($ok && $prio > 1) {
                Db::exec('INSERT INTO notification_budget (player_id, budget_date, sent_count) VALUES (?, ?, 1)
                          ON DUPLICATE KEY UPDATE sent_count = sent_count + 1', [$n['player_id'], $day]);
            }
            $sent += $ok ? 1 : 0;
        }
        return $sent;
    }

    public static function text(string $type, array $payload, string $lang): string
    {
        $row = Db::one('SELECT uz, ru, en FROM locales WHERE locale_key = ?', ["notify.$type"]);
        $tpl = $row ? ($row[$lang] ?? null) ?: $row['uz'] : $type;
        foreach ($payload as $k => $v) {
            if (is_scalar($v)) {
                $tpl = str_replace('{' . $k . '}', (string) $v, $tpl);
            }
        }
        return $tpl;
    }

    public static function telegram(int $chatId, string $text, array $env, bool $withButton = true): bool
    {
        $body = ['chat_id' => $chatId, 'text' => $text];
        if ($withButton) {
            $body['reply_markup'] = json_encode(['inline_keyboard' => [[
                ['text' => '🐺 Blue Wolf', 'web_app' => ['url' => $env['webapp_url']]],
            ]]]);
        }
        $ch = curl_init('https://api.telegram.org/bot' . $env['bot_token'] . '/sendMessage');
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10]);
        $res = curl_exec($ch);
        curl_close($ch);
        return is_string($res) && (json_decode($res, true)['ok'] ?? false) === true;
    }
}
