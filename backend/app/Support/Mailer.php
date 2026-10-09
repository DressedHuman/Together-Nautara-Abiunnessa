<?php

namespace App\Support;

use App\Models\AlumniProfile;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Plain-text emails, sent synchronously (shared hosting has no queue worker).
 * Failures are logged, never shown to the caller, so API responses can't
 * reveal whether an address exists.
 */
class Mailer
{
    public static function otp(User $user, string $code, string $purpose): void
    {
        $subject = $purpose === 'reset' ? 'Reset your Together password' : 'Your Together verification code';
        $intro = $purpose === 'reset'
            ? 'Use this code to reset your Together password:'
            : 'Use this code to verify your Together alumni account:';
        $body = "{$intro}\n\n    {$code}\n\n"
            .'The code expires in '.config('together.otp.ttl_minutes')." minutes. If you didn't ask for it, you can ignore this email.\n\n"
            ."Together — Nautara Abiunnessa B.L. High School alumni\n".config('together.frontend_url')."\n";
        static::send($user->email, $subject, $body);
    }

    public static function status(AlumniProfile $profile, bool $approved, string $note = ''): void
    {
        $url = config('together.frontend_url');
        if ($approved) {
            $subject = 'Welcome to Together: your profile is approved';
            $body = "Hi {$profile->full_name_en},\n\nThe alumni committee has verified your profile. You now appear in the "
                ."alumni directory and can see other members' contact links.\n\n{$url}/directory\n";
        } else {
            $subject = 'Your Together profile needs another look';
            $body = "Hi {$profile->full_name_en},\n\nThe alumni committee couldn't verify your profile yet."
                .($note !== '' ? "\n\nNote from the committee: {$note}" : '')
                ."\n\nYou can update your details and resubmit at any time:\n{$url}/profile/edit\n";
        }
        static::send($profile->user->email, $subject, $body);
    }

    private static function send(string $to, string $subject, string $body): void
    {
        try {
            Mail::raw($body, fn ($m) => $m->to($to)->subject($subject));
        } catch (\Throwable $e) {
            Log::error('Email to user failed: '.$e->getMessage());
        }
    }
}
