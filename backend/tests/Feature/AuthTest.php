<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Phone;
use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_register_verify_login(): void
    {
        $res = $this->postJson(self::API.'/auth/register/', [
            'email' => 'New@Example.com', 'phone' => '01712 345678',
            'password' => self::PASSWORD, 'password_confirm' => self::PASSWORD,
        ]);
        $res->assertCreated()->assertJsonMissingPath('otp');            // code never leaves via the API
        $user = User::where('email', 'new@example.com')->firstOrFail();
        $this->assertSame('+8801712345678', $user->phone);
        $code = $this->lastCode();
        $this->assertNotSame($code, $user->otp_code);                    // stored hashed

        // unverified users can't sign in, but are told why
        $this->postJson(self::API.'/auth/login-email/', ['email' => 'new@example.com', 'password' => self::PASSWORD])
            ->assertForbidden()->assertJsonPath('code', 'unverified');

        $this->postJson(self::API.'/auth/verify-otp/', ['email' => 'new@example.com', 'otp' => $code])
            ->assertOk()->assertJsonStructure(['access', 'refresh', 'user' => ['id', 'email', 'role', 'has_profile']]);
        $this->assertTrue($user->fresh()->is_verified);

        $this->postJson(self::API.'/auth/login-email/', ['email' => 'NEW@example.com', 'password' => self::PASSWORD])->assertOk();
        $this->postJson(self::API.'/auth/login-phone/', ['phone' => '+880 1712-345678', 'password' => self::PASSWORD])
            ->assertOk()->assertJsonPath('user.has_profile', false);
    }

    public function test_register_validation(): void
    {
        config(['together.throttle.register_per_hour' => 100]);
        $this->makeUser('taken@example.com', phone: '+8801711111111');
        $cases = [
            [['email' => 'taken@EXAMPLE.com', 'phone' => '01811111111'], 'email'],
            [['email' => 'a@example.com', 'phone' => '01711111111'], 'phone'],
            [['email' => 'b@example.com', 'phone' => '12345'], 'phone'],
            [['email' => 'not-an-email', 'phone' => '01911111112'], 'email'],
        ];
        foreach ($cases as [$data, $field]) {
            $this->postJson(self::API.'/auth/register/', [...$data, 'password' => self::PASSWORD, 'password_confirm' => self::PASSWORD])
                ->assertStatus(400)->assertJsonStructure([$field]);
        }
        foreach (['password', '12345678901', 'short1'] as $weak) {
            $this->postJson(self::API.'/auth/register/', ['email' => 'c@example.com', 'phone' => '01911111111', 'password' => $weak, 'password_confirm' => $weak])
                ->assertStatus(400)->assertJsonStructure(['password']);
        }
        $this->postJson(self::API.'/auth/register/', ['email' => 'c@example.com', 'phone' => '01911111111', 'password' => self::PASSWORD, 'password_confirm' => 'different-1'])
            ->assertStatus(400)->assertJsonStructure(['password_confirm']);
    }

    public function test_wrong_credentials_are_generic(): void
    {
        $this->makeUser('a@example.com');
        foreach ([
            ['login-email', ['email' => 'a@example.com', 'password' => 'nope-nope-1']],
            ['login-email', ['email' => 'ghost@example.com', 'password' => 'nope-nope-1']],
            ['login-phone', ['phone' => '01799999999', 'password' => 'nope-nope-1']],
        ] as [$path, $data]) {
            $this->postJson(self::API."/auth/{$path}/", $data)->assertStatus(400)->assertExactJson(['detail' => ['Invalid credentials.']]);
        }
    }

    public function test_inactive_user_cannot_login_or_use_token(): void
    {
        $user = $this->makeUser('off@example.com');
        $access = $this->postJson(self::API.'/auth/login-email/', ['email' => 'off@example.com', 'password' => self::PASSWORD])->json('access');
        $user->forceFill(['is_active' => false])->save();
        $this->postJson(self::API.'/auth/login-email/', ['email' => 'off@example.com', 'password' => self::PASSWORD])->assertStatus(400);
        $this->withToken($access)->getJson(self::API.'/auth/me/')->assertUnauthorized();
    }

    public function test_otp_request_does_not_enumerate(): void
    {
        $this->makeUser('real@example.com', verified: false);
        $a = $this->postJson(self::API.'/auth/request-otp/', ['email' => 'real@example.com']);
        $b = $this->postJson(self::API.'/auth/request-otp/', ['email' => 'ghost@example.com']);
        $this->assertSame($a->status(), $b->status());
        $this->assertSame($a->json(), $b->json());
        $this->assertCount(1, $this->mails());
    }

    public function test_otp_resend_cooldown(): void
    {
        $this->makeUser('cool@example.com', verified: false);
        $this->postJson(self::API.'/auth/request-otp/', ['email' => 'cool@example.com']);
        $this->postJson(self::API.'/auth/request-otp/', ['email' => 'cool@example.com']);
        $this->assertCount(1, $this->mails());
    }

    public function test_otp_brute_force_burns_code(): void
    {
        $user = $this->makeUser('bf@example.com', verified: false);
        $code = $user->generateOtp('verify');
        $wrong = $code === '000000' ? '111111' : '000000';
        for ($i = 0; $i < 5; $i++) {
            $this->postJson(self::API.'/auth/verify-otp/', ['email' => 'bf@example.com', 'otp' => $wrong])->assertStatus(400);
        }
        $this->postJson(self::API.'/auth/verify-otp/', ['email' => 'bf@example.com', 'otp' => $code])->assertStatus(400);  // right code, too late
    }

    public function test_otp_expires(): void
    {
        $user = $this->makeUser('exp@example.com', verified: false);
        $code = $user->generateOtp('verify');
        $user->forceFill(['otp_created_at' => now()->subMinutes(11)])->save();
        $this->postJson(self::API.'/auth/verify-otp/', ['email' => 'exp@example.com', 'otp' => $code])->assertStatus(400);
    }

    public function test_reset_code_cannot_verify(): void
    {
        $user = $this->makeUser('p@example.com', verified: false);
        $code = $user->generateOtp('reset');
        $this->postJson(self::API.'/auth/verify-otp/', ['email' => 'p@example.com', 'otp' => $code])->assertStatus(400);
    }

    public function test_password_reset_revokes_sessions(): void
    {
        $this->makeUser('r@example.com');
        $login = $this->postJson(self::API.'/auth/login-email/', ['email' => 'r@example.com', 'password' => self::PASSWORD])->json();
        $this->postJson(self::API.'/auth/password-reset/', ['email' => 'r@example.com'])->assertOk();
        $this->postJson(self::API.'/auth/password-reset/confirm/', ['email' => 'r@example.com', 'otp' => $this->lastCode(), 'new_password' => 'An0ther-good-one'])->assertOk();
        $this->postJson(self::API.'/auth/refresh-token/', ['refresh' => $login['refresh']])->assertUnauthorized();
        $this->withToken($login['access'])->getJson(self::API.'/auth/me/')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->postJson(self::API.'/auth/login-email/', ['email' => 'r@example.com', 'password' => 'An0ther-good-one'])->assertOk();
    }

    public function test_change_password(): void
    {
        $this->login($this->makeUser('c@example.com'));
        $this->postJson(self::API.'/auth/change-password/', ['current_password' => 'wrong', 'new_password' => 'An0ther-good-one'])
            ->assertStatus(400)->assertJsonStructure(['current_password']);
        $this->postJson(self::API.'/auth/change-password/', ['current_password' => self::PASSWORD, 'new_password' => 'An0ther-good-one'])
            ->assertOk()->assertJsonStructure(['access', 'refresh']);
    }

    public function test_refresh_rotation_reuse_detection_and_logout(): void
    {
        $this->makeUser('t@example.com');
        $tokens = $this->postJson(self::API.'/auth/login-email/', ['email' => 't@example.com', 'password' => self::PASSWORD])->json();
        $this->withToken($tokens['access'])->getJson(self::API.'/auth/me/')->assertOk()->assertJsonPath('email', 't@example.com');
        $this->app['auth']->forgetGuards();

        $new = $this->postJson(self::API.'/auth/refresh-token/', ['refresh' => $tokens['refresh']])->assertOk()->json();
        // the old refresh token was rotated; re-using it signs out everywhere
        $this->postJson(self::API.'/auth/refresh-token/', ['refresh' => $tokens['refresh']])->assertUnauthorized();
        $this->postJson(self::API.'/auth/refresh-token/', ['refresh' => $new['refresh']])->assertUnauthorized();

        $again = $this->postJson(self::API.'/auth/login-email/', ['email' => 't@example.com', 'password' => self::PASSWORD])->json();
        $this->postJson(self::API.'/auth/logout/', ['refresh' => $again['refresh']])->assertOk();
        $this->postJson(self::API.'/auth/refresh-token/', ['refresh' => $again['refresh']])->assertUnauthorized();
    }

    public function test_access_token_expires(): void
    {
        $this->makeUser('e@example.com');
        $access = $this->postJson(self::API.'/auth/login-email/', ['email' => 'e@example.com', 'password' => self::PASSWORD])->json('access');
        $this->travel(31)->minutes();
        $this->withToken($access)->getJson(self::API.'/auth/me/')->assertUnauthorized();
    }

    public function test_me_requires_auth(): void
    {
        $this->getJson(self::API.'/auth/me/')->assertUnauthorized()->assertJsonStructure(['detail']);
        $this->withToken('not-a-token')->getJson(self::API.'/auth/me/')->assertUnauthorized();
        // clients that don't ask for JSON still get a JSON 401, not a redirect or 500
        $this->withToken('at_'.str_repeat('A', 64))->get(self::API.'/auth/me/', ['Accept' => '*/*'])->assertUnauthorized()->assertJsonStructure(['detail']);
        $this->get(self::API.'/approvals/pending/', ['Accept' => 'text/html'])->assertUnauthorized();
    }

    public function test_register_is_throttled(): void
    {
        $codes = [];
        for ($i = 0; $i < 7; $i++) {
            $codes[] = $this->postJson(self::API.'/auth/register/', ['email' => "x{$i}@example.com", 'phone' => "0171000000{$i}", 'password' => self::PASSWORD, 'password_confirm' => self::PASSWORD])->status();
        }
        $this->assertSame([201, 201, 201, 201, 201, 429, 429], $codes);
    }

    public function test_login_is_throttled(): void
    {
        $this->makeUser('th@example.com');
        $codes = [];
        for ($i = 0; $i < 12; $i++) {
            $codes[] = $this->postJson(self::API.'/auth/login-email/', ['email' => 'th@example.com', 'password' => 'bad-bad-bad'])->status();
        }
        $this->assertContains(429, $codes);
    }

    public function test_committee_emails_are_promoted_on_verify(): void
    {
        config(['together.committee_emails' => ['boss@example.com']]);
        $user = $this->makeUser('boss@example.com', verified: false);
        $this->postJson(self::API.'/auth/verify-otp/', ['email' => 'boss@example.com', 'otp' => $user->generateOtp('verify')])
            ->assertOk()->assertJsonPath('user.role', 'committee');
    }

    public function test_phone_normalization(): void
    {
        $this->assertSame('+8801712345678', Phone::normalize('01712-345678'));
        $this->assertSame('+8801712345678', Phone::normalize('8801712345678'));
        $this->assertSame('+442079460958', Phone::normalize('0044 20 7946 0958'));
        $this->assertNull(Phone::normalize('hello'));
    }
}
