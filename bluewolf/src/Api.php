<?php
declare(strict_types=1);

namespace BlueWolf;

/**
 * HTTP kirish nuqtasi: marshrutlash, auth, idempotentlik, chastota cheklovi, javob konverti.
 * Baza URL: /api/v1 (API spetsifikatsiyasi).
 */
final class Api
{
    /** v2 ga qoldirilgan boʻlimlar (texnik spec bo'lim 5) — 501 NOT_IN_MVP. */
    private const V2_PREFIXES = ['/clans', '/wars', '/camp', '/oases', '/season', '/shop', '/vacation', '/market',
        '/notifications'];

    public static function handle(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $pos = strpos($uri, '/api/v1');
        $path = '/' . trim($pos === false ? $uri : substr($uri, $pos + 7), '/');
        $headers = array_change_key_case(function_exists('getallheaders') ? (getallheaders() ?: []) : self::serverHeaders());
        $body = json_decode(file_get_contents('php://input') ?: '[]', true) ?: [];

        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Headers: Content-Type, X-Init-Data, X-Client-Version, X-Request-Id, X-Dev-User');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        if ($method === 'OPTIONS') {
            http_response_code(204);
            return;
        }
        [$code, $out] = self::dispatch($method, $path, $_GET, $body, $headers, time());
        http_response_code($code);
        echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /** @return array{0:int,1:array} — testlarda toʻgʻridan-toʻgʻri chaqiriladi */
    public static function dispatch(string $method, string $path, array $query, array $body, array $headers, int $now): array
    {
        $pid = null;
        $reqId = null;
        try {
            // Ochiq endpointlar
            if ($method === 'GET' && $path === '/config') {
                return [200, ['ok' => true, 'data' => self::publicConfig()]];
            }
            if ($method === 'GET' && preg_match('#^/locales/(uz|ru|en)$#', $path, $m)) {
                return [200, ['ok' => true, 'data' => self::locales($m[1])]];
            }
            $ver = $headers['x-client-version'] ?? null;
            if ($ver !== null && version_compare($ver, \bw_env()['client_version_min'], '<')) {
                throw new ApiError('VERSION_OUTDATED', 'Klientni yangilang');
            }
            $tg = Auth::userFromHeaders($headers, $now);
            $pid = self::player($tg, $now);
            self::rateLimit($pid, self::bucket($method, $path), $now);

            if ($method === 'POST') {
                $reqId = $headers['x-request-id'] ?? '';
                if (!preg_match('/^[0-9a-fA-F-]{8,36}$/', $reqId)) {
                    throw new ApiError('REQUEST_ID_REQUIRED', 'X-Request-Id (UUID) kerak');
                }
                $cached = Db::val('SELECT response FROM request_log WHERE player_id = ? AND request_id = ?', [$pid, $reqId]);
                if ($cached !== null) {
                    return [200, json_decode($cached, true)];
                }
            }
            foreach (self::V2_PREFIXES as $p) {
                if (str_starts_with($path, $p)) {
                    throw new ApiError('NOT_IN_MVP', 'Bu boʻlim keyingi versiyada ochiladi');
                }
            }

            $prev = Db::one('SELECT last_seen_at FROM players WHERE id = ?', [$pid]);
            Game::sync($pid, $now);
            Db::exec('UPDATE players SET last_seen_at = ? WHERE id = ?', [Db::dt($now), $pid]);

            $data = self::route($method, $path, $query, $body, $pid, $now, Db::ts($prev['last_seen_at']));
            $out = ['ok' => true, 'data' => $data, 'state' => Game::snapshot($pid, $now)];
            if ($reqId !== null) {
                Db::exec('INSERT IGNORE INTO request_log (player_id, request_id, endpoint, response) VALUES (?, ?, ?, ?)',
                    [$pid, $reqId, mb_substr($path, 0, 64), json_encode($out, JSON_UNESCAPED_UNICODE)]);
            }
            return [200, $out];
        } catch (ApiError $e) {
            $out = ['ok' => false, 'error' => ['code' => $e->errCode, 'message' => $e->getMessage(), 'details' => $e->details]];
            if ($pid !== null && $e->errCode !== 'RATE_LIMITED') {
                $out['state'] = Game::snapshot($pid, $now);
            }
            return [$e->http(), $out];
        } catch (\Throwable $e) {
            error_log('[bluewolf] ' . $e);
            $msg = \bw_env()['dev'] ? $e->getMessage() . ' @ ' . basename($e->getFile()) . ':' . $e->getLine() : 'Server xatosi';
            return [500, ['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $msg, 'details' => []]]];
        }
    }

    private static function route(string $method, string $path, array $q, array $b, int $pid, int $now, int $prevSeen): array
    {
        $int = static fn($v) => (int) ($v ?? 0);
        $str = static fn($v) => is_string($v) ? $v : '';
        $key = $method . ' ' . $path;
        switch (true) {
            case $key === 'GET /state':
                return self::state($pid, $now, $prevSeen);
            case $key === 'GET /profile':
                return self::profile($pid);
            case $key === 'POST /profile/allocation':
                return Buildings::setAllocation($pid, $b);
            case $key === 'POST /profile/language':
                if (!in_array($b['lang'] ?? '', ['uz', 'ru', 'en'], true)) {
                    throw new ApiError('BAD_REQUEST', 'Til notoʻgʻri');
                }
                Db::exec('UPDATE players SET lang = ? WHERE id = ?', [$b['lang'], $pid]);
                return ['lang' => $b['lang']];

            case $key === 'GET /buildings':
                return ['buildings' => Buildings::describe(Game::lockless($pid))];
            case $key === 'POST /buildings/upgrade':
                return Buildings::upgrade($pid, $str($b['type'] ?? null), $now);
            case $key === 'POST /buildings/collect':
                return Buildings::collect($pid);
            case $key === 'POST /hospital/heal':
                return Army::heal($pid, $str($b['role'] ?? null), $int($b['tier'] ?? null), $int($b['qty'] ?? null), $now);

            case $key === 'GET /army':
                return Army::describe(Game::lockless($pid));
            case $key === 'POST /army/train':
                return Army::train($pid, $str($b['role'] ?? null), $int($b['tier'] ?? null), $int($b['qty'] ?? null), $now);
            case $key === 'POST /army/promote':
                return Army::promote($pid, $str($b['role'] ?? null), $int($b['from_tier'] ?? null), $int($b['to_tier'] ?? null),
                    $int($b['qty'] ?? null), $now);
            case $key === 'GET /army/promote/preview':
                return Army::promotePreview($pid, $str($q['role'] ?? null), $int($q['from_tier'] ?? null),
                    $int($q['to_tier'] ?? null), $int($q['qty'] ?? null));

            case $key === 'POST /queue/cancel':
                return Queues::cancel($pid, $int($b['queue_id'] ?? null), $now);
            case $key === 'POST /queue/speedup':
                return Queues::speedup($pid, $int($b['queue_id'] ?? null), $int($b['seconds'] ?? null), !empty($b['free']), $now);
            case $key === 'GET /queue/speedup/quote':
                return Queues::speedupQuote($pid, max(1, $int($q['seconds'] ?? 3600)), $now);

            case $key === 'GET /hunt':
                return ['prey' => Hunt::preyList(Game::lockless($pid))];
            case $key === 'POST /hunt':
                return Hunt::start($pid, $str($b['prey'] ?? null), $b['payload'] ?? [], $now);

            case $key === 'GET /pvp/targets':
                return Pvp::targets($pid, $now);
            case $key === 'POST /pvp/targets/refresh':
                return Pvp::targets($pid, $now, true);
            case $key === 'POST /pvp/scout':
                return Pvp::scout($pid, $int($b['target_id'] ?? null), $b['payload'] ?? null, $now);
            case $method === 'GET' && (bool) preg_match('#^/pvp/scout/(\d+)$#', $path, $m):
                return ['report' => Pvp::report($pid, (int) $m[1], $now)];
            case $key === 'POST /pvp/attack':
                return Pvp::attack($pid, $int($b['target_id'] ?? null), $b['payload'] ?? null, $now);
            case $method === 'POST' && (bool) preg_match('#^/march/(\d+)/recall$#', $path, $m):
                return Pvp::recall($pid, (int) $m[1], $now);
            case $key === 'GET /battles':
                return Pvp::battles($pid, $int($q['limit'] ?? 20), isset($q['cursor']) ? (int) $q['cursor'] : null);
            case $method === 'GET' && (bool) preg_match('#^/battles/(\d+)$#', $path, $m):
                return Pvp::battle($pid, (int) $m[1]);

            case $key === 'GET /quests':
                return Quests::list($pid, $now);
            case $method === 'POST' && (bool) preg_match('#^/quests/(\d+)/claim$#', $path, $m):
                return Quests::claim($pid, (int) $m[1], $now);

            case $key === 'POST /tutorial/step':
                return Tutorial::step($pid, $int($b['step'] ?? null), $now);
            case $key === 'POST /tutorial/skip':
                return Tutorial::skip($pid, $now);

            case $key === 'POST /events':
                $events = array_slice(is_array($b['events'] ?? null) ? $b['events'] : [$b], 0, 20);
                foreach ($events as $ev) {
                    if (is_string($ev['event'] ?? null)) {
                        Analytics::log($pid, 'client.' . $ev['event'], is_array($ev['payload'] ?? null) ? $ev['payload'] : []);
                    }
                }
                return ['logged' => count($events)];
        }
        throw new ApiError('NOT_FOUND', 'Endpoint topilmadi');
    }

    private static function state(int $pid, int $now, int $prevSeen): array
    {
        Quests::bump($pid, 'login', 1, $now);
        $away = $now - $prevSeen;
        $out = Game::snapshot($pid, $now, true);
        if ($away >= Config::get('offline_report_min') * 60) { // qaytish ekrani
            $attacks = Db::all('SELECT b.*, a.display_name AS att_name, d.display_name AS def_name, a.level AS att_level,
                                d.level AS def_level FROM battles b JOIN players a ON a.id = b.attacker_id
                                JOIN players d ON d.id = b.defender_id WHERE b.defender_id = ? AND b.created_at > ?',
                [$pid, Db::dt($prevSeen)]);
            if ($away >= Config::get('sleep_shield_h') * 3600) {
                // Qaytish qalqoni
                Db::exec('UPDATE players SET shield_until = GREATEST(COALESCE(shield_until, ?), ?) WHERE id = ?',
                    [Db::dt($now), Db::dt($now + (int) (Config::get('return_grace_min') * 60)), $pid]);
            }
            $out['offline_report'] = ['away_seconds' => $away,
                'attacks' => array_map(static fn($b) => Pvp::battleOut($b, $pid, false), $attacks)];
        }
        return $out;
    }

    private static function profile(int $pid): array
    {
        $ctx = Game::lockless($pid);
        return [
            'name' => $ctx['p']['display_name'], 'level' => $ctx['p']['level'], 'cp' => Game::cp($ctx),
            'army' => Army::describe($ctx),
            'stats' => ['hunts' => (int) $ctx['p']['stat_hunts'], 'battles' => (int) $ctx['p']['stat_battles'],
                'wins' => (int) $ctx['p']['stat_wins']],
            'league' => null, 'season_rank' => null,
            'created_at' => Game::iso($ctx['p']['created_at']),
        ];
    }

    private static function player(array $tg, int $now): int
    {
        $row = Db::one('SELECT id, status, banned_until FROM players WHERE tg_id = ?', [$tg['id']]);
        if (!$row) {
            return Game::createPlayer($tg, $now);
        }
        if ($row['status'] === 'banned' && ($row['banned_until'] === null || Db::ts($row['banned_until']) > $now)) {
            throw new ApiError('BANNED', 'Akkaunt bloklangan');
        }
        return (int) $row['id'];
    }

    private static function bucket(string $method, string $path): string
    {
        return match (true) {
            $path === '/pvp/targets/refresh' => 'refresh',
            $path === '/pvp/attack', $path === '/pvp/scout' => 'pvp',
            $path === '/events' => 'events',
            $method === 'POST' => 'write',
            default => 'read',
        };
    }

    private static function rateLimit(int $pid, string $bucket, int $now): void
    {
        $limit = Config::int("rl_{$bucket}");
        $window = $bucket === 'refresh' ? 3600 : 60;
        $start = Db::dt($now - $now % $window);
        Db::exec('INSERT INTO rate_limits (player_id, bucket, window_start, hits) VALUES (?, ?, ?, 1)
                  ON DUPLICATE KEY UPDATE hits = IF(window_start = VALUES(window_start), hits + 1, 1),
                                          window_start = VALUES(window_start)', [$pid, $bucket, $start]);
        $hits = (int) Db::val('SELECT hits FROM rate_limits WHERE player_id = ? AND bucket = ?', [$pid, $bucket]);
        if ($hits > $limit) {
            if (PHP_SAPI !== 'cli') {
                header('Retry-After: ' . ($window - $now % $window));
            }
            throw new ApiError('RATE_LIMITED', 'Soʻrovlar juda tez', ['retry_after' => $window - $now % $window]);
        }
    }

    /** Klient uchun ochiq parametrlar (narxlar, vaqtlar, jadval maʼlumotlari). */
    private static function publicConfig(): array
    {
        $levels = [];
        foreach (Config::data('levels') as $l => $row) {
            $levels[$l] = ['name' => $row['name'], 'xp_total' => $row['xp_total'], 'cp' => $row['cp'], 'army' => $row['army']];
        }
        return [
            'max_level' => Config::int('max_level'), 'levels' => $levels, 'prey' => Config::data('prey'),
            'tutorial' => array_map(static fn($s) => ['level' => $s['level'], 'reward' => $s['reward']], Config::data('tutorial')),
            'tutorial_skip_step' => Config::int('tutorial_skip_step'),
            'roles' => F::ROLES, 'tiers' => F::TIERS, 'role_building' => F::ROLE_BUILDING, 'beats' => F::BEATS,
            'march_speed' => Config::get('march_speed'), 'scout_speed' => Config::get('scout_speed'),
            'pack_unlock_level' => Config::int('pack_unlock_level'),
            'shield_newbie_level' => Config::int('shield_newbie_level'),
            'hunger' => ['cp_penalty' => Config::get('hunger_cp_penalty'), 'prod_penalty' => Config::get('hunger_prod_penalty')],
            'speedup' => ['base_price' => Config::get('speedup_base_price'), 'growth' => Config::get('speedup_price_growth'),
                'daily_cap_seconds' => F::speedupDailyCap()],
            'locale_version' => (int) Db::val('SELECT COUNT(*) FROM locales'),
        ];
    }

    private static function locales(string $lang): array
    {
        $out = [];
        foreach (Db::all('SELECT locale_key, uz, ru, en FROM locales') as $r) {
            $out[$r['locale_key']] = ($r[$lang] ?? null) ?: $r['uz'];
        }
        return $out;
    }

    private static function serverHeaders(): array
    {
        $h = [];
        foreach ($_SERVER as $k => $v) {
            if (str_starts_with($k, 'HTTP_')) {
                $h[str_replace('_', '-', substr($k, 5))] = $v;
            }
        }
        return $h;
    }
}
