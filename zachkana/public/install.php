<?php

/*
 * Zachkana — brauzer orqali oʻrnatuvchi.
 *
 * Oddiy (shared) hosting uchun: SSH va composer shart emas.
 * 1) talablarni tekshiradi, 2) MySQL ulanishini sinaydi, 3) .env yozadi,
 * 4) jadvallarni yaratadi, 5) administratorni qoʻshadi.
 * Tugagach storage/installed fayli yaratiladi va oʻrnatuvchi qayta ishlamaydi.
 */

declare(strict_types=1);
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

const ZK_MIN_PHP = '8.3.0';

$root = dirname(__DIR__);
$lock = $root.'/storage/installed';
$envFile = $root.'/.env';

function h(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function baseUrl(): string
{
    $https = ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' || ($_SERVER['SERVER_PORT'] ?? '') === '443';
    $dir = preg_replace('#/public$#', '', rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/'));

    return ($https ? 'https' : 'http').'://'.($_SERVER['HTTP_HOST'] ?? 'localhost').$dir;
}

/** .env dagi kalitni almashtiradi (yoʻq boʻlsa qoʻshadi). */
function setEnv(string $env, string $key, string $value): string
{
    // Maxsus belgili qiymat: bitta tirnoq ichida (hech narsa almashtirilmaydi)
    if ($value !== '' && preg_match('/[\s#"\'$\\\\=]/', $value)) {
        $value = str_contains($value, "'") ? '"'.addcslashes($value, '"\\').'"' : "'".$value."'";
    }
    $line = $key.'='.$value;
    $count = 0;
    $env = preg_replace('/^'.preg_quote($key, '/').'=.*$/m', str_replace(['\\', '$'], ['\\\\', '\\$'], $line), $env, 1, $count);

    return $count ? $env : rtrim($env)."\n".$line."\n";
}

function normalizePhone(string $phone): string
{
    $d = preg_replace('/\D+/', '', $phone);

    return strlen($d) === 9 ? '998'.$d : $d;
}

// ---- Talablar ----------------------------------------------------------
$checks = [
    ['PHP '.ZK_MIN_PHP.' yoki yangiroq (hozir: '.PHP_VERSION.')', version_compare(PHP_VERSION, ZK_MIN_PHP, '>='), true],
];
foreach (['pdo_mysql' => 'MySQL (pdo_mysql)', 'mbstring' => 'mbstring', 'openssl' => 'openssl', 'intl' => 'intl', 'fileinfo' => 'fileinfo',
    'tokenizer' => 'tokenizer', 'dom' => 'dom / xml', 'ctype' => 'ctype', 'json' => 'json', 'filter' => 'filter'] as $ext => $label) {
    $checks[] = ['PHP kengaytmasi: '.$label, extension_loaded($ext), true];
}
$checks[] = ['PHP kengaytmasi: gd (rasmlarni tahrirlash, ixtiyoriy)', extension_loaded('gd') || extension_loaded('imagick'), false];
foreach (['storage', 'storage/app/public', 'storage/framework/cache', 'storage/framework/sessions', 'storage/framework/views', 'storage/logs', 'bootstrap/cache', '.'] as $dir) {
    $path = $root.'/'.$dir;
    $checks[] = ['Yozish ruxsati: '.($dir === '.' ? 'loyiha papkasi (.env uchun)' : $dir.'/'), is_dir($path) && is_writable($path), true];
}
$checks[] = ['vendor/ papkasi (kutubxonalar)', is_file($root.'/vendor/autoload.php'), true];
$requirementsOk = ! array_filter($checks, fn ($c) => $c[2] && ! $c[1]);

// ---- Oʻrnatish ---------------------------------------------------------
$errors = [];
$log = [];
$done = false;
$old = $_POST + [
    'app_url' => baseUrl(), 'db_host' => 'localhost', 'db_port' => '3306', 'db_name' => '', 'db_user' => '', 'db_pass' => '',
    'admin_name' => '', 'admin_phone' => '', 'admin_password' => '', 'sample' => $_SERVER['REQUEST_METHOD'] === 'POST' ? '' : '1',
];

if (is_file($lock)) {
    $installedAt = trim((string) file_get_contents($lock));
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $requirementsOk) {
    $url = rtrim(trim($old['app_url']), '/');
    $phone = normalizePhone($old['admin_phone']);

    if (! filter_var($url, FILTER_VALIDATE_URL)) {
        $errors[] = 'Sayt manzili notoʻgʻri (masalan: https://zachkana.uz).';
    }
    if ($old['db_name'] === '' || $old['db_user'] === '') {
        $errors[] = 'Maʼlumotlar bazasi nomi va foydalanuvchisini kiriting.';
    }
    if (mb_strlen(trim($old['admin_name'])) < 2) {
        $errors[] = 'Administrator ismini kiriting.';
    }
    if (! preg_match('/^998\d{9}$/', $phone)) {
        $errors[] = 'Telefon raqam notoʻgʻri (masalan: 90 123 45 67).';
    }
    if (strlen($old['admin_password']) < 8) {
        $errors[] = 'Administrator paroli kamida 8 belgidan iborat boʻlsin.';
    }

    if (! $errors) {
        try {
            $pdo = new PDO(
                sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $old['db_host'], (int) $old['db_port'], $old['db_name']),
                $old['db_user'], $old['db_pass'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
            );
            $log[] = 'MySQL ulanishi muvaffaqiyatli (versiya '.$pdo->getAttribute(PDO::ATTR_SERVER_VERSION).').';
            $pdo = null;
        } catch (Throwable $e) {
            $errors[] = 'Maʼlumotlar bazasiga ulanib boʻlmadi: '.$e->getMessage();
        }
    }

    if (! $errors) {
        $createdEnv = false;
        try {
            $env = (string) file_get_contents($root.'/.env.example');
            foreach ([
                'APP_ENV' => 'production', 'APP_DEBUG' => 'false', 'APP_URL' => $url,
                'APP_KEY' => 'base64:'.base64_encode(random_bytes(32)), 'LOG_LEVEL' => 'error',
                'DB_CONNECTION' => 'mysql', 'DB_HOST' => $old['db_host'], 'DB_PORT' => (string) (int) $old['db_port'],
                'DB_DATABASE' => $old['db_name'], 'DB_USERNAME' => $old['db_user'], 'DB_PASSWORD' => $old['db_pass'],
                'SESSION_SECURE_COOKIE' => str_starts_with($url, 'https://') ? 'true' : 'false',
            ] as $k => $v) {
                $env = setEnv($env, $k, $v);
            }
            if (file_put_contents($envFile, $env) === false) {
                throw new RuntimeException('.env faylini yozib boʻlmadi.');
            }
            @chmod($envFile, 0640);
            $createdEnv = true;
            $log[] = '.env fayli yaratildi.';

            // Laravel’ni shu soʻrov ichida ishga tushiramiz (exec/SSH shart emas)
            require $root.'/vendor/autoload.php';
            $app = require $root.'/bootstrap/app.php';
            /** @var Kernel $kernel */
            $kernel = $app->make(Kernel::class);
            $kernel->bootstrap();

            if ($kernel->call('migrate', ['--force' => true]) !== 0) {
                throw new RuntimeException('Migratsiya xatosi: '.$kernel->output());
            }
            $log[] = 'Jadvallar yaratildi.';

            if (! empty($old['sample'])) {
                $kernel->call('db:seed', ['--class' => 'Database\\Seeders\\SampleDataSeeder', '--force' => true]);
                $log[] = 'Namuna maʼlumotlar yuklandi (keyin admin paneldan oʻchirishingiz mumkin).';
            }

            User::updateOrCreate(
                ['phone' => $phone],
                ['name' => trim($old['admin_name']), 'password' => $old['admin_password'], 'role' => 'admin'],
            );
            $log[] = 'Administrator yaratildi: +'.$phone;

            // Yuklangan fayllar uchun public/storage
            $link = __DIR__.'/storage';
            if (! file_exists($link)) {
                try {
                    $kernel->call('storage:link');
                } catch (Throwable) {
                    // symlink taqiqlangan boʻlishi mumkin
                }
            }
            if (is_link($link) || is_dir($link)) {
                $log[] = 'Fayllar papkasi tayyor (public/storage).';
            }
            if (! file_exists($link)) {
                @mkdir($link, 0755, true);
                file_put_contents($envFile, setEnv((string) file_get_contents($envFile), 'PUBLIC_STORAGE_PATH', $link));
                $log[] = 'Hosting symlink’ka ruxsat bermadi — fayllar toʻgʻridan-toʻgʻri public/storage ga saqlanadi.';
            }

            file_put_contents($lock, date('Y-m-d H:i:s'));
            $done = true;
            $selfDeleted = @unlink(__FILE__);
        } catch (Throwable $e) {
            $errors[] = $e->getMessage();
            if ($createdEnv) {
                @unlink($envFile); // qayta urinish mumkin boʻlsin
            }
        }
    }
}
?><!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Zachkana — oʻrnatish</title>
<link rel="icon" href="icons/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="ui/zachkana-ui.css">
<style>
  body { min-height: 100vh; padding: 32px 16px 64px; }
  .wrap { max-width: 720px; margin: 0 auto; }
  .head { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
  .head img { width: 52px; height: 52px; }
  .panel { background: var(--z-surface); border: 1px solid var(--z-border); border-radius: var(--z-radius-lg); padding: 24px; margin-bottom: 16px; box-shadow: var(--z-shadow-1); }
  .panel h2 { font-family: var(--z-font-display); font-size: var(--z-text-xl); margin: 0 0 16px; display: flex; align-items: center; gap: 10px; }
  .panel h2 span { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--z-primary); color: var(--z-on-primary); font-family: var(--z-font-ui); font-size: 14px; }
  .checks { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
  .checks li { display: flex; gap: 10px; align-items: center; font-size: var(--z-text-sm); }
  .ok { color: var(--z-success); font-weight: 800; } .bad { color: var(--z-danger); font-weight: 800; } .warn { color: var(--z-accent-text); font-weight: 800; }
  .grid2 { display: grid; gap: 14px; grid-template-columns: 1fr; }
  @media (min-width: 600px) { .grid2 { grid-template-columns: 1fr 1fr; } }
  .log { font-size: var(--z-text-sm); margin: 0; padding-left: 20px; }
  label.check { display: flex; gap: 10px; align-items: flex-start; font-size: var(--z-text-sm); }
  label.check input { margin-top: 3px; width: 18px; height: 18px; }
</style>
</head>
<body class="z-ornament">
<div class="wrap">
  <div class="head">
    <img src="assets/logo-mark.svg" alt="">
    <div><div class="z-overline">zachkana.uz</div><h1 class="z-h3">Saytni oʻrnatish</h1></div>
  </div>

<?php if (isset($installedAt) && ! $done) { ?>
  <div class="panel">
    <div class="z-alert z-alert--success"><svg class="z-icon" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7"/></svg><div><strong>Sayt allaqachon oʻrnatilgan</strong>Oʻrnatilgan sana: <?= h($installedAt) ?>. Xavfsizlik uchun <code>public/install.php</code> faylini oʻchirib tashlang.</div></div>
    <p style="margin:16px 0 0" class="z-row"><a class="z-btn z-btn--primary" href="./">Saytni ochish</a><a class="z-btn" href="admin">Admin panel</a></p>
  </div>
<?php } elseif ($done) { ?>
  <div class="panel">
    <div class="z-alert z-alert--success"><svg class="z-icon" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7"/></svg><div><strong>Tayyor! Sayt oʻrnatildi.</strong>Admin panelga telefon raqamingiz va parolingiz bilan kiring.</div></div>
    <ul class="log" style="margin-top:16px"><?php foreach ($log as $l) { ?><li><?= h($l) ?></li><?php } ?></ul>
    <?php if (empty($selfDeleted)) { ?><div class="z-alert z-alert--danger" style="margin-top:16px"><svg class="z-icon" viewBox="0 0 24 24"><path d="M12 8v5M12 16h.01"/><circle cx="12" cy="12" r="9"/></svg><div><strong>Muhim</strong>Hostingdan <code>public/install.php</code> faylini oʻchirib tashlang (u qayta ishlamaydi, lekin oʻchirgan maʼqul).</div></div><?php } ?>
    <p style="margin:16px 0 0" class="z-row"><a class="z-btn z-btn--primary" href="admin">Admin panelga kirish</a><a class="z-btn" href="./">Saytni ochish</a></p>
  </div>
<?php } else { ?>
  <div class="panel">
    <h2><span>1</span>Talablar</h2>
    <ul class="checks">
      <?php foreach ($checks as [$label, $ok, $required]) { ?>
        <li><span class="<?= $ok ? 'ok' : ($required ? 'bad' : 'warn') ?>"><?= $ok ? '✓' : ($required ? '✗' : '!') ?></span><?= h($label) ?></li>
      <?php } ?>
    </ul>
    <?php if (! $requirementsOk) { ?>
      <div class="z-alert z-alert--danger" style="margin-top:16px"><svg class="z-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><div><strong>Talablar bajarilmagan</strong>Hosting boshqaruv panelida (cPanel → “Select PHP Version”) PHP versiyasi va kengaytmalarni yoqing, papkalarga yozish ruxsatini (755/775) bering, soʻng sahifani yangilang.</div></div>
    <?php } ?>
  </div>

  <?php if ($errors) { ?>
    <div class="z-alert z-alert--danger" style="margin-bottom:16px"><svg class="z-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><div><strong>Xatolik</strong><?php foreach ($errors as $e) { ?><div><?= h($e) ?></div><?php } ?></div></div>
  <?php } ?>

  <form method="post" autocomplete="off">
    <div class="panel">
      <h2><span>2</span>Maʼlumotlar bazasi (MySQL)</h2>
      <p class="z-small" style="margin:-6px 0 16px">Avval hosting panelida (cPanel → “MySQL Databases”) boʻsh baza va foydalanuvchi yarating.</p>
      <div class="grid2">
        <label class="z-field"><span class="z-label">Server</span><input class="z-input" name="db_host" value="<?= h($old['db_host']) ?>" required></label>
        <label class="z-field"><span class="z-label">Port</span><input class="z-input" name="db_port" value="<?= h($old['db_port']) ?>" inputmode="numeric" required></label>
        <label class="z-field"><span class="z-label">Baza nomi</span><input class="z-input" name="db_name" value="<?= h($old['db_name']) ?>" required></label>
        <label class="z-field"><span class="z-label">Foydalanuvchi</span><input class="z-input" name="db_user" value="<?= h($old['db_user']) ?>" required></label>
        <label class="z-field" style="grid-column:1/-1"><span class="z-label">Parol</span><input class="z-input" type="password" name="db_pass" value="<?= h($old['db_pass']) ?>"></label>
      </div>
    </div>

    <div class="panel">
      <h2><span>3</span>Sayt va administrator</h2>
      <div class="grid2">
        <label class="z-field" style="grid-column:1/-1"><span class="z-label">Sayt manzili</span><input class="z-input" name="app_url" value="<?= h($old['app_url']) ?>" required><span class="z-hint">Masalan: https://zachkana.uz</span></label>
        <label class="z-field"><span class="z-label">Ismingiz</span><input class="z-input" name="admin_name" value="<?= h($old['admin_name']) ?>" required></label>
        <label class="z-field"><span class="z-label">Telefon raqam</span><input class="z-input" name="admin_phone" type="tel" placeholder="90 123 45 67" value="<?= h($old['admin_phone']) ?>" required><span class="z-hint">Admin panelga shu raqam bilan kirasiz</span></label>
        <label class="z-field" style="grid-column:1/-1"><span class="z-label">Parol</span><input class="z-input" type="password" name="admin_password" minlength="8" required autocomplete="new-password"><span class="z-hint">Kamida 8 belgi</span></label>
        <label class="check" style="grid-column:1/-1"><input type="checkbox" name="sample" value="1" <?= ! empty($old['sample']) ? 'checked' : '' ?>><span><strong>Namuna maʼlumotlarni yuklash</strong><br><span class="z-muted">Shajara, tarix, faxriylar va chat uchun toʻqilgan misollar. Saytni koʻrib chiqish uchun qulay, keyin admin paneldan oʻchiriladi.</span></span></label>
      </div>
    </div>

    <button class="z-btn z-btn--primary z-btn--lg z-btn--block" type="submit" <?= $requirementsOk ? '' : 'disabled' ?>>Oʻrnatish</button>
  </form>
<?php } ?>
</div>
</body>
</html>
