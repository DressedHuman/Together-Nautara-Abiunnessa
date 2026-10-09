<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** At least 8 characters, not only digits, not a common password, not the email name. */
class StrongPassword implements ValidationRule
{
    private const COMMON = [
        'password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop',
        'iloveyou', 'abc12345', 'abcd1234', 'admin123', 'welcome1', 'welcome123', 'letmein1', 'football',
        'baseball', 'sunshine', 'princess', 'trustno1', 'superman', 'bangladesh', 'bangladesh1', 'dhaka123',
        '11111111', '00000000', '88888888', 'asdfghjk', 'zxcvbnm1', 'passw0rd', 'p@ssw0rd', 'changeme',
    ];

    public function __construct(private ?string $email = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $value = (string) $value;
        if (mb_strlen($value) < 8) {
            $fail('Use at least 8 characters.');
        } elseif (mb_strlen($value) > 128) {
            $fail('Use at most 128 characters.');
        } elseif (ctype_digit($value)) {
            $fail('Mix in some letters, not only numbers.');
        } elseif (in_array(strtolower($value), self::COMMON, true)) {
            $fail('This password is too common.');
        } elseif ($this->email && strlen($local = strtolower(strtok($this->email, '@'))) >= 4 && str_contains(strtolower($value), $local)) {
            $fail('The password is too similar to your email.');
        }
    }
}
