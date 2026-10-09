<?php

use App\Http\Middleware\SecurityHeaders;
use Illuminate\Support\Facades\Route;

// The React app (built by `npm run build` in frontend/ into public/app/).
// Every non-API page returns its index.html; React Router takes it from there.
Route::get('/{path?}', function () {
    $index = public_path('app/index.html');
    if (! is_file($index)) {
        return response('The frontend has not been built yet. Run `npm run build` in frontend/.', 503)
            ->header('Content-Type', 'text/plain');
    }

    return response(file_get_contents($index))
        ->header('Content-Type', 'text/html; charset=UTF-8')
        ->header('Cache-Control', 'no-cache')
        ->header('Content-Security-Policy', SecurityHeaders::CSP);
})->where('path', '^(?!api(/|$)|uploads/|app/).*$');
