<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\StrongPassword;
use App\Support\Mailer;
use App\Support\Phone;
use App\Support\Present;
use App\Support\Tokens;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const GENERIC_OTP = 'If an account matches, we have emailed it a 6-digit code.';

    // Same cost as a real check, used when an account doesn't exist (no timing oracle).
    private const DUMMY_HASH = '$2y$12$y6UKBLlnVcCVa5dl54k8d..CvQXK54MrtUzw910s62SHvYLnCxx5O';

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:191'],
            'phone' => ['required', 'string', 'max:30'],
            'password' => ['required', 'string', new StrongPassword($request->input('email'))],
            'password_confirm' => ['required', 'string'],
        ], ['email.email' => 'Enter a valid email address.']);

        $email = strtolower(trim($data['email']));
        $phone = Phone::normalize($data['phone']);
        $errors = [];
        if (User::where('email', $email)->exists()) {
            $errors['email'] = 'An account with this email already exists.';
        }
        if (! $phone) {
            $errors['phone'] = 'Enter a valid phone number, e.g. 01712345678 or +8801712345678.';
        } elseif (User::where('phone', $phone)->exists()) {
            $errors['phone'] = 'An account with this phone number already exists.';
        }
        if ($data['password'] !== $data['password_confirm']) {
            $errors['password_confirm'] = 'Passwords do not match.';
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        $user = User::create(['email' => $email, 'phone' => $phone, 'password' => $data['password']]);
        Mailer::otp($user, $user->generateOtp('verify'), 'verify');

        return response()->json([
            'message' => 'Account created. We emailed you a 6-digit code to verify it.',
            'email' => $user->email,
        ], 201);
    }

    public function loginEmail(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|string|email', 'password' => 'required|string']);
        $user = User::where('email', strtolower(trim($data['email'])))->first();

        return $this->attempt($user, $data['password']);
    }

    public function loginPhone(Request $request): JsonResponse
    {
        $data = $request->validate(['phone' => 'required|string', 'password' => 'required|string']);
        $phone = Phone::normalize($data['phone']);
        $user = $phone ? User::where('phone', $phone)->first() : null;

        return $this->attempt($user, $data['password']);
    }

    private function attempt(?User $user, string $password): JsonResponse
    {
        $valid = Hash::check($password, $user?->password ?? self::DUMMY_HASH) && $user;
        if (! $valid || ! $user->is_active) {
            throw ValidationException::withMessages(['detail' => 'Invalid credentials.']);
        }
        if (! $user->is_verified) {
            // The password was right, so it's safe to say why sign-in stopped.
            if ($user->canResendOtp()) {
                Mailer::otp($user, $user->generateOtp('verify'), 'verify');
            }

            return response()->json([
                'detail' => 'Please verify your email first. We sent you a code.',
                'code' => 'unverified',
                'email' => $user->email,
            ], 403);
        }
        $this->promoteIfCommittee($user);

        return $this->tokens($user);
    }

    public function requestOtp(Request $request, ?string $purpose = null): JsonResponse
    {
        $data = $request->validate(['email' => 'required|string|email', 'purpose' => 'nullable|in:verify,reset']);
        $purpose ??= $data['purpose'] ?? 'verify';
        $user = User::where('email', strtolower(trim($data['email'])))->where('is_active', true)->first();
        $wanted = $user && ! ($purpose === 'verify' && $user->is_verified);
        if ($wanted && $user->canResendOtp()) {
            Mailer::otp($user, $user->generateOtp($purpose), $purpose);
        }

        return response()->json(['message' => self::GENERIC_OTP]);
    }

    public function requestReset(Request $request): JsonResponse
    {
        return $this->requestOtp($request, 'reset');
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $user = $this->userForCode($request, 'verify');
        if (! $user->is_active) {
            return response()->json(['detail' => 'Account is disabled.'], 403);
        }
        if (! $user->is_verified) {
            $user->forceFill(['is_verified' => true])->save();
        }
        $this->promoteIfCommittee($user);

        return $this->tokens($user, ['message' => 'Account verified.']);
    }

    public function confirmReset(Request $request): JsonResponse
    {
        $request->validate(['new_password' => ['required', 'string', new StrongPassword($request->input('email'))]]);
        $user = $this->userForCode($request, 'reset');
        $user->forceFill(['password' => $request->input('new_password'), 'is_verified' => true])->save();
        Tokens::revokeAll($user);

        return response()->json(['message' => 'Password updated. You can sign in now.']);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'current_password' => 'required|string',
            'new_password' => ['required', 'string', new StrongPassword($user->email)],
        ]);
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Current password is incorrect.']);
        }
        $user->forceFill(['password' => $data['new_password']])->save();
        Tokens::revokeAll($user);

        return $this->tokens($user, ['message' => 'Password changed.']);
    }

    public function refresh(Request $request): JsonResponse
    {
        $pair = Tokens::refresh($request->input('refresh'));
        if (! $pair) {
            return response()->json(['detail' => 'Token is invalid or expired.', 'code' => 'token_not_valid'], 401);
        }

        return response()->json($pair);
    }

    public function logout(Request $request): JsonResponse
    {
        Tokens::revoke($request->input('refresh'));
        Tokens::revoke($request->bearerToken());

        return response()->json(['message' => 'Signed out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(Present::user($request->user()->load('profile')));
    }

    private function userForCode(Request $request, string $purpose): User
    {
        $data = $request->validate([
            'email' => 'required|string|email',
            'otp' => ['required', 'string', 'regex:/^\d{6}$/'],
        ], ['otp.regex' => 'Enter the 6-digit code.']);
        $user = User::where('email', strtolower(trim($data['email'])))->first();
        if (! $user || ! $user->verifyOtp($data['otp'], $purpose)) {
            throw ValidationException::withMessages(['detail' => 'Invalid or expired code.']);
        }

        return $user;
    }

    /** COMMITTEE_EMAILS lets the first admins in without SSH access. */
    private function promoteIfCommittee(User $user): void
    {
        if ($user->role !== 'committee' && in_array($user->email, config('together.committee_emails'), true)) {
            $user->forceFill(['role' => 'committee'])->save();
        }
    }

    private function tokens(User $user, array $extra = []): JsonResponse
    {
        return response()->json([...Tokens::issue($user), 'user' => Present::user($user->load('profile')), ...$extra]);
    }
}
