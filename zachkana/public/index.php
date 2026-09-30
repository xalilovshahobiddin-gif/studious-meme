<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Hali oʻrnatilmagan (.env yoʻq) — brauzerdagi oʻrnatuvchiga yuborish
if (! is_file(__DIR__.'/../.env') && is_file(__DIR__.'/install.php')) {
    $base = preg_replace('#/public$#', '', rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/'));
    if (str_contains($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
        http_response_code(503);
        header('Content-Type: application/json');
        echo json_encode(['message' => 'not_installed', 'install' => $base.'/install.php']);
    } else {
        header('Location: '.$base.'/install.php');
    }
    exit;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
