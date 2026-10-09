<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    public const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        ."font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self'; "
        ."frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        $headers = $response->headers;
        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('X-Frame-Options', 'DENY');
        $headers->set('Referrer-Policy', 'same-origin');
        $headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        if ($request->is('api/*')) {
            $headers->set('Cache-Control', 'no-store, private');
        } elseif (str_contains((string) $headers->get('Content-Type'), 'text/html')) {
            $headers->set('Content-Security-Policy', self::CSP);
        }
        if ($request->isSecure() && app()->isProduction()) {
            $headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
