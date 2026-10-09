<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\EnsureVerified;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        // The SPA route only returns index.html: no sessions, cookies or CSRF,
        // so it is registered without the "web" middleware group.
        then: fn () => Route::group([], __DIR__.'/../routes/web.php'),
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureRole::class,
            'verified.account' => EnsureVerified::class,
        ]);
        $middleware->append(SecurityHeaders::class);
        // API clients get a 401, never a redirect to a login page.
        $middleware->redirectGuestsTo(fn (Request $request) => $request->is('api/*') ? null : '/login');
        $proxies = env('TRUSTED_PROXIES');
        if ($proxies) {
            $middleware->trustProxies(at: $proxies === '*' ? '*' : array_map('trim', explode(',', $proxies)));
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Errors use the same shape as the original DRF API: {"field": ["message"]} or {"detail": "..."}.
        $api = fn (Request $request) => $request->is('api/*');

        $exceptions->render(function (ValidationException $e, Request $request) use ($api) {
            if (! $api($request)) {
                return null;
            }
            $errors = $e->errors();
            if (isset($errors['detail'])) {
                return response()->json(['detail' => $errors['detail']], 400);
            }

            return response()->json($errors, 400);
        });
        $exceptions->render(fn (AuthenticationException $e, Request $request) => $api($request)
            ? response()->json(['detail' => 'Authentication credentials were not provided or are invalid.'], 401) : null);
        $exceptions->render(fn (AuthorizationException|AccessDeniedHttpException $e, Request $request) => $api($request)
            ? response()->json(['detail' => $e->getMessage() ?: 'You do not have permission to do this.'], 403) : null);
        $exceptions->render(fn (ModelNotFoundException|NotFoundHttpException $e, Request $request) => $api($request)
            ? response()->json(['detail' => 'Not found.'], 404) : null);
        $exceptions->render(fn (ThrottleRequestsException $e, Request $request) => $api($request)
            ? response()->json(['detail' => 'Too many requests. Please wait and try again.'], 429, $e->getHeaders()) : null);
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) use ($api) {
            if (! $api($request)) {
                return null;
            }
            $message = $e->getStatusCode() >= 500 ? 'Server error.' : ($e->getMessage() ?: 'Request failed.');

            return response()->json(['detail' => $message], $e->getStatusCode(), $e->getHeaders());
        });
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $api($request) || $request->expectsJson());
    })->create();
