<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Hash;

class User extends Authenticatable
{
    use HasUuids;

    public const ROLES = ['alumni', 'coordinator', 'committee'];

    protected $fillable = ['email', 'phone', 'password', 'role', 'is_verified', 'is_active'];

    protected $hidden = ['password', 'otp_code'];

    protected $attributes = ['role' => 'alumni', 'otp_purpose' => '', 'otp_attempts' => 0];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_verified' => 'boolean',
            'is_active' => 'boolean',
            'otp_created_at' => 'datetime',
            'last_login_at' => 'datetime',
            'otp_attempts' => 'integer',
        ];
    }

    public function profile(): HasOne
    {
        return $this->hasOne(AlumniProfile::class);
    }

    public function coordinatedBatches(): HasMany
    {
        return $this->hasMany(BatchCoordinator::class);
    }

    public function isCommittee(): bool
    {
        return $this->role === 'committee';
    }

    public function isApprovedAlumnus(): bool
    {
        return $this->profile?->status === 'approved';
    }

    /* ---------- One-time codes ---------- */

    public function canResendOtp(): bool
    {
        return ! $this->otp_created_at
            || now()->greaterThanOrEqualTo($this->otp_created_at->copy()->addSeconds(config('together.otp.resend_seconds')));
    }

    /** Create a fresh 6-digit code, store only its hash, return the code. */
    public function generateOtp(string $purpose): string
    {
        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
        $this->forceFill([
            'otp_code' => Hash::make($code),
            'otp_created_at' => now(),
            'otp_purpose' => $purpose,
            'otp_attempts' => 0,
        ])->save();

        return $code;
    }

    public function clearOtp(): void
    {
        $this->forceFill(['otp_code' => null, 'otp_created_at' => null, 'otp_purpose' => '', 'otp_attempts' => 0])->save();
    }

    /** Each wrong guess counts; the code is burned after too many failures or once used. */
    public function verifyOtp(string $code, string $purpose): bool
    {
        if (! $this->otp_code || ! $this->otp_created_at || $this->otp_purpose !== $purpose) {
            return false;
        }
        $expired = now()->greaterThan($this->otp_created_at->copy()->addMinutes(config('together.otp.ttl_minutes')));
        if ($expired || $this->otp_attempts >= config('together.otp.max_attempts')) {
            $this->clearOtp();

            return false;
        }
        if (Hash::check($code, $this->otp_code)) {
            $this->clearOtp();

            return true;
        }
        $this->forceFill(['otp_attempts' => $this->otp_attempts + 1])->save();

        return false;
    }
}
