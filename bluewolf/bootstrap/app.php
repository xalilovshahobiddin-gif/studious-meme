<?php

use App\Support\ApiResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API xatolari ham { ok: false, error: {...} } konvertida qaytadi.
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return match ($e->getStatusCode()) {
                404 => ApiResponse::error('NOT_FOUND', 'Bunday endpoint yoʻq', 404),
                405 => ApiResponse::error('METHOD_NOT_ALLOWED', 'Bu metod qoʻllanmaydi', 405),
                429 => ApiResponse::error('RATE_LIMITED', 'Soʻrovlar juda koʻp', 429),
                default => ApiResponse::error('HTTP_'.$e->getStatusCode(), 'Xato', $e->getStatusCode()),
            };
        });
    })->create();
