<?php
declare(strict_types=1);

// Serversiz demo: Mini App + brauzer ichidagi dvigatel bitta HTML faylga yigʻiladi.
//   php tools/build_demo.php                 → public/demo.html (toʻliq sahifa, faylni ochib ham ishlaydi)
//   php tools/build_demo.php --artifact OUT  → <html>/<head>/<body> siz variant (joylash platformalari uchun)

$root = dirname(__DIR__);
$pub = "$root/public";
$artifact = ($argv[1] ?? '') === '--artifact';
$out = $artifact ? ($argv[2] ?? "$root/demo-artifact.html") : "$pub/demo.html";

ob_start();
require "$root/tools/export_demo_data.php";
$data = ob_get_clean();

$index = file_get_contents("$pub/index.html");
preg_match('#<body>(.*)</body>#s', $index, $m);
$body = $m[1];
// Server va Telegram skriptlari oʻrniga — inline demo
$body = preg_replace('#<script src="assets/(app|icons)\.js"></script>#', '', $body);

$css = file_get_contents("$pub/assets/style.css");
$js = $data . "\n" . file_get_contents("$pub/assets/wolves.js") . "\n" . file_get_contents("$pub/assets/icons.js") . "\n" . file_get_contents("$pub/assets/demo-engine.js") . "\n" . file_get_contents("$pub/assets/app.js");
$js = str_replace('</script', '<\/script', $js);

$font = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Exo+2:wght@600;700;800&display=swap">';
$head = "<title>Blue Wolf</title>\n<meta name=\"theme-color\" content=\"#0f1626\">\n$font\n<style>\n$css\n</style>\n";
$page = $head . $body . "<script>\n$js\n</script>\n";
if (!$artifact) {
    $page = "<!DOCTYPE html>\n<html lang=\"uz\">\n<head>\n<meta charset=\"utf-8\">\n" .
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover\">\n" .
        $head . "</head>\n<body>\n" . $body . "<script>\n$js\n</script>\n</body>\n</html>\n";
}
file_put_contents($out, $page);
fwrite(STDERR, "Yozildi: $out (" . round(strlen($page) / 1024) . " KB)\n");
