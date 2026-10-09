<?php

namespace Tests;

use App\Models\AlumniProfile;
use App\Models\Batch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected const API = '/api/v1';

    protected const PASSWORD = 'Str0ng-pass-phrase';

    private static int $n = 0;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('uploads');
    }

    protected function makeUser(string $email, string $role = 'alumni', bool $verified = true, ?string $phone = null): User
    {
        $user = User::create(['email' => $email, 'phone' => $phone ?? sprintf('+88017%08d', ++self::$n), 'password' => self::PASSWORD]);
        $user->forceFill(['role' => $role, 'is_verified' => $verified])->save();

        return $user;
    }

    protected function makeProfile(User $user, int $year = 2015, string $status = 'pending', array $extra = []): AlumniProfile
    {
        $profile = new AlumniProfile([
            'user_id' => $user->id,
            'batch_id' => Batch::firstOrCreate(['year' => $year])->id,
            'full_name_en' => $extra['full_name_en'] ?? 'Test Person',
            'full_name_bn' => 'টেস্ট',
            ...array_diff_key($extra, ['full_name_en' => 1]),
        ]);
        $profile->forceFill(['status' => $status])->save();

        return $profile;
    }

    protected function login(User $user): static
    {
        return $this->actingAs($user, 'api');
    }

    /** Bodies of the emails sent during this test. */
    protected function mails(): array
    {
        return app('mailer')->getSymfonyTransport()->messages()
            ->map(fn ($m) => ['to' => $m->getOriginalMessage()->getTo()[0]->getAddress(), 'body' => $m->getOriginalMessage()->getTextBody()])
            ->all();
    }

    protected function lastCode(): string
    {
        $mails = $this->mails();
        preg_match('/\b(\d{6})\b/', $mails ? end($mails)['body'] : '', $m);

        return $m[1] ?? '';
    }

    protected function image(string $type = 'jpeg', int $w = 1200, int $h = 900, string $name = 'me.jpg'): UploadedFile
    {
        $img = imagecreatetruecolor($w, $h);
        imagefill($img, 0, 0, imagecolorallocate($img, 20, 60, 120));
        ob_start();
        match ($type) {
            'png' => imagepng($img),
            'gif' => imagegif($img),
            'webp' => imagewebp($img),
            default => imagejpeg($img),
        };
        $bytes = ob_get_clean();

        return UploadedFile::fake()->createWithContent($name, $bytes);
    }
}
