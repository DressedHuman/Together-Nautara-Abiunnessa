<?php

namespace Tests\Feature;

use Tests\TestCase;

class SecurityTest extends TestCase
{
    public function test_api_root_and_headers(): void
    {
        $this->getJson(self::API.'/')->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_unknown_api_route_is_json_404(): void
    {
        $this->get(self::API.'/nope/')->assertNotFound()->assertExactJson(['detail' => 'Not found.']);
    }

    public function test_spa_fallback_has_csp_and_does_not_shadow_api(): void
    {
        $res = $this->get('/directory');
        $this->assertContains($res->status(), [200, 503]);
        if ($res->status() === 200) {
            $res->assertHeader('Content-Security-Policy');
        }
        $this->get('/api/v1/directory/')->assertOk()->assertJsonStructure(['results']);
    }

    public function test_cors_only_for_allowed_origins(): void
    {
        $this->getJson(self::API.'/directory/', ['Origin' => 'https://evil.example'])->assertHeaderMissing('Access-Control-Allow-Origin');
        $this->getJson(self::API.'/directory/', ['Origin' => 'http://localhost:5173'])->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    public function test_no_cookies_are_set(): void
    {
        $this->getJson(self::API.'/directory/')->assertCookieMissing('laravel_session')->assertCookieMissing('XSRF-TOKEN');
    }
}
