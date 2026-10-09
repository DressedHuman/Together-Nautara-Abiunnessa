<?php

return [
    // Where the React app lives; used in emails.
    'frontend_url' => rtrim((string) env('FRONTEND_URL', env('APP_URL', 'http://localhost:8000')), '/'),

    // Accounts with these emails become committee members when they verify
    // their address, so the first admin can be created without SSH access.
    'committee_emails' => array_values(array_filter(array_map(
        fn ($e) => strtolower(trim($e)),
        explode(',', (string) env('COMMITTEE_EMAILS', ''))
    ))),

    'tokens' => [
        'access_minutes' => (int) env('ACCESS_TOKEN_MINUTES', 30),
        'refresh_days' => (int) env('REFRESH_TOKEN_DAYS', 7),
    ],

    'otp' => [
        'ttl_minutes' => 10,
        'max_attempts' => 5,
        'resend_seconds' => 60,
    ],

    'throttle' => [
        'login_per_minute' => (int) env('THROTTLE_LOGIN_PER_MINUTE', 10),
        'register_per_hour' => (int) env('THROTTLE_REGISTER_PER_HOUR', 5),
        'otp_per_hour' => (int) env('THROTTLE_OTP_PER_HOUR', 10),
        'guest_per_minute' => (int) env('THROTTLE_GUEST_PER_MINUTE', 120),
        'user_per_minute' => (int) env('THROTTLE_USER_PER_MINUTE', 300),
    ],

    'photos' => [
        'max_bytes' => 5 * 1024 * 1024,
        'max_pixels' => 40_000_000,
        'max_side' => 800,
    ],

    'first_batch_year' => 1950,
];
