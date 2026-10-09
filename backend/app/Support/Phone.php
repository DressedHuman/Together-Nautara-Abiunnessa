<?php

namespace App\Support;

class Phone
{
    /**
     * Normalize to +<digits>. Bangladeshi local numbers (01XXXXXXXXX) become
     * +8801XXXXXXXXX. Returns null when the input isn't a phone number.
     */
    public static function normalize(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        $phone = preg_replace('/[\s\-().]/', '', $raw);
        if (preg_match('/^01\d{9}$/', $phone)) {
            return '+88'.$phone;
        }
        if (preg_match('/^8801\d{9}$/', $phone)) {
            return '+'.$phone;
        }
        if (str_starts_with($phone, '00')) {
            $phone = '+'.substr($phone, 2);
        }

        return preg_match('/^\+\d{8,15}$/', $phone) ? $phone : null;
    }
}
