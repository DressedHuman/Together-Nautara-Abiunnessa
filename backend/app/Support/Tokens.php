<?php

namespace App\Support;

use App\Models\ApiToken;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Opaque bearer tokens: short-lived access tokens plus rotating refresh
 * tokens. Only SHA-256 hashes are stored, so a database leak doesn't leak
 * sessions. Re-using a refresh token that was already rotated revokes every
 * session of that user (token theft detection).
 */
class Tokens
{
    public static function issue(User $user): array
    {
        if (random_int(1, 50) === 1) {
            static::prune();
        }
        $access = static::create($user, 'access', now()->addMinutes(config('together.tokens.access_minutes')));
        $refresh = static::create($user, 'refresh', now()->addDays(config('together.tokens.refresh_days')));
        $user->forceFill(['last_login_at' => now()])->save();

        return ['access' => $access, 'refresh' => $refresh];
    }

    public static function userForAccessToken(?string $token): ?User
    {
        $record = static::find($token, 'access');
        if (! $record || $record->revoked_at || $record->expires_at->isPast()) {
            return null;
        }
        $user = $record->user;

        return $user && $user->is_active ? $user : null;
    }

    /** Rotate a refresh token. Returns a new pair, or null if it's invalid. */
    public static function refresh(?string $token): ?array
    {
        $record = static::find($token, 'refresh');
        if (! $record) {
            return null;
        }
        if ($record->revoked_at) {
            static::revokeAll($record->user);   // a stolen, already-used token

            return null;
        }
        if ($record->expires_at->isPast() || ! $record->user?->is_active) {
            return null;
        }
        $record->forceFill(['revoked_at' => now()])->save();

        return static::issue($record->user);
    }

    public static function revoke(?string $token): void
    {
        foreach (['access', 'refresh'] as $type) {
            static::find($token, $type)?->forceFill(['revoked_at' => now()])->save();
        }
    }

    public static function revokeAll(?User $user): void
    {
        if ($user) {
            ApiToken::where('user_id', $user->id)->whereNull('revoked_at')->update(['revoked_at' => now()]);
        }
    }

    public static function prune(): void
    {
        ApiToken::where('expires_at', '<', now()->subDay())->delete();
    }

    private static function create(User $user, string $type, $expires): string
    {
        $token = ($type === 'access' ? 'at_' : 'rt_').Str::random(64);
        ApiToken::create([
            'user_id' => $user->id,
            'type' => $type,
            'token_hash' => hash('sha256', $token),
            'expires_at' => $expires,
        ]);

        return $token;
    }

    private static function find(?string $token, string $type): ?ApiToken
    {
        if (! is_string($token) || strlen($token) < 20 || strlen($token) > 200) {
            return null;
        }

        return ApiToken::with('user')->where('token_hash', hash('sha256', $token))->where('type', $type)->first();
    }
}
