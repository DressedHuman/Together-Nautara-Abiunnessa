<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;

class EnsureVerified
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->user()?->is_verified) {
            throw new AuthorizationException('Your account must be verified.');
        }

        return $next($request);
    }
}
