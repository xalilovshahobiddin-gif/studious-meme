<?php
// Faqat lokal dev: php -S 127.0.0.1:8080 -t public public/router.php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($path, '/api/v1')) {
    require __DIR__ . '/api/index.php';
    return true;
}
return false;
