<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class Social
{
    private const DOMAINS = [
        'facebook' => ['facebook.com', 'fb.com', 'fb.me'],
        'linkedin' => ['linkedin.com'],
    ];

    /** Accept only real Facebook/LinkedIn profile links; return them as https URLs. */
    public static function clean(?string $value, string $network): string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }
        if (! preg_match('#^https?://#i', $value)) {
            $value = 'https://'.$value;
        }
        $parts = parse_url($value);
        $host = strtolower($parts['host'] ?? '');
        $ok = $parts !== false
            && in_array(strtolower($parts['scheme'] ?? ''), ['http', 'https'], true)
            && ! isset($parts['user']) && ! isset($parts['pass'])
            && collect(self::DOMAINS[$network])->contains(fn ($d) => $host === $d || str_ends_with($host, '.'.$d));
        if (! $ok || strlen($value) > 255) {
            throw ValidationException::withMessages([$network => 'Enter a link to a '.ucfirst($network === 'linkedin' ? 'LinkedIn' : 'Facebook').' profile.']);
        }

        return 'https://'.$host.($parts['path'] ?? '').(isset($parts['query']) ? '?'.$parts['query'] : '');
    }
}
