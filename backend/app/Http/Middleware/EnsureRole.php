<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;

/** Usage: ->middleware('role:committee') or 'role:coordinator,committee'. */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        if (! in_array($request->user()?->role, $roles, true)) {
            throw new AuthorizationException(in_array('coordinator', $roles, true)
                ? 'Coordinator or committee access required.'
                : 'Committee access required.');
        }

        return $next($request);
    }
}
