<?php

namespace App\Providers;

use App\Support\Tokens;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Model::shouldBeStrict(! $this->app->isProduction());

        // Bearer access tokens (see App\Support\Tokens).
        Auth::viaRequest('access-token', fn (Request $request) => Tokens::userForAccessToken($request->bearerToken()));

        $t = fn (string $key) => (int) config("together.throttle.{$key}");
        RateLimiter::for('api', fn (Request $r) => $r->user()
            ? Limit::perMinute($t('user_per_minute'))->by('u:'.$r->user()->id)
            : Limit::perMinute($t('guest_per_minute'))->by('ip:'.$r->ip()));
        RateLimiter::for('login', fn (Request $r) => Limit::perMinute($t('login_per_minute'))->by('login:'.$r->ip()));
        RateLimiter::for('register', fn (Request $r) => Limit::perHour($t('register_per_hour'))->by('register:'.$r->ip()));
        RateLimiter::for('otp', fn (Request $r) => Limit::perHour($t('otp_per_hour'))->by('otp:'.$r->ip()));
    }
}
