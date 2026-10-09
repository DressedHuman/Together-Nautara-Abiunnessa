<?php

namespace Tests\Feature;

use App\Models\AlumniProfile;
use App\Models\Batch;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = $this->makeUser('me@example.com');
        $this->login($this->user);
    }

    private function payload(array $extra = []): array
    {
        return ['batch_year' => 2015, 'full_name_en' => 'Rahim Uddin', 'full_name_bn' => 'রহিম উদ্দিন', ...$extra];
    }

    public function test_create_and_update_profile(): void
    {
        $this->getJson(self::API.'/alumni/me/')->assertNotFound();
        $res = $this->post(self::API.'/alumni/me/', $this->payload(['city' => ' Dhaka ', 'linkedin' => 'linkedin.com/in/rahim']))
            ->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('batch_year', 2015)
            ->assertJsonPath('city', 'Dhaka')
            ->assertJsonPath('linkedin', 'https://linkedin.com/in/rahim');
        $this->assertTrue(Batch::where('year', 2015)->exists());
        $this->post(self::API.'/alumni/me/', $this->payload())->assertStatus(400);   // only one profile

        $this->post(self::API.'/alumni/me/update/', ['profession' => 'Teacher'])->assertOk()->assertJsonPath('profession', 'Teacher');
        $this->putJson(self::API.'/alumni/me/', ['company' => 'School'])->assertOk()->assertJsonPath('company', 'School')->assertJsonPath('profession', 'Teacher');
        $this->getJson(self::API.'/auth/me/')->assertJsonPath('has_profile', true)->assertJsonPath('profile_status', 'pending');
        $this->assertSame($res->json('id'), $this->getJson(self::API.'/alumni/me/')->json('id'));
    }

    public function test_cannot_set_status_or_owner(): void
    {
        $other = $this->makeUser('other@example.com');
        $res = $this->post(self::API.'/alumni/me/', $this->payload(['status' => 'approved', 'user_id' => $other->id, 'approved_by' => $other->id]))->assertCreated();
        $profile = AlumniProfile::findOrFail($res->json('id'));
        $this->assertSame('pending', $profile->status);
        $this->assertSame($this->user->id, $profile->user_id);
        $this->assertNull($profile->approved_by);
        $this->postJson(self::API.'/alumni/me/update/', ['status' => 'approved'])->assertOk()->assertJsonPath('status', 'pending');
        $this->assertSame('alumni', $this->user->fresh()->role);
    }

    public function test_validation(): void
    {
        foreach ([
            ['batch_year' => 1800], ['batch_year' => 'abc'], ['full_name_en' => ' '],
            ['facebook' => 'https://evil.example/facebook.com'], ['linkedin' => 'javascript:alert(1)'],
            ['facebook' => 'https://user:pass@facebook.com/x'], ['bio' => str_repeat('a', 1001)],
        ] as $bad) {
            $this->post(self::API.'/alumni/me/', $this->payload($bad))->assertStatus(400);
        }
        $this->post(self::API.'/alumni/me/', ['full_name_en' => 'X Y'])->assertStatus(400)->assertJsonStructure(['batch_year', 'full_name_bn']);
    }

    public function test_unverified_user_cannot_create_profile(): void
    {
        $this->login($this->makeUser('unv@example.com', verified: false));
        $this->post(self::API.'/alumni/me/', $this->payload())->assertForbidden();
    }

    public function test_photo_is_reencoded_resized_and_replaced(): void
    {
        $res = $this->post(self::API.'/alumni/me/', $this->payload(['photo' => $this->image('png', 1600, 1200, 'me.png')]))->assertCreated();
        $profile = AlumniProfile::findOrFail($res->json('id'));
        $disk = Storage::disk('uploads');
        $disk->assertExists($profile->photo);
        $this->assertStringEndsWith('.jpg', $profile->photo);
        $this->assertStringNotContainsString($profile->id, $profile->photo);       // unguessable name
        [$w, $h, $type] = getimagesizefromstring($disk->get($profile->photo));
        $this->assertSame([800, 600, IMAGETYPE_JPEG], [$w, $h, $type]);
        $this->assertStringContainsString('/uploads/alumni/photos/', $res->json('photo'));

        $old = $profile->photo;
        $this->post(self::API.'/alumni/me/update/', ['photo' => $this->image('webp', 300, 300, 'x.webp')])->assertOk();
        $disk->assertMissing($old);
        $profile->refresh();
        $disk->assertExists($profile->photo);

        $this->post(self::API.'/alumni/me/update/', ['remove_photo' => 'true'])->assertOk()->assertJsonPath('photo', null);
        $disk->assertMissing($profile->photo);
    }

    public function test_photo_strips_exif(): void
    {
        // A JPEG with an EXIF APP1 segment (as phones write, incl. GPS)
        $jpeg = $this->image()->get();
        $exif = "Exif\0\0".str_repeat('GPS-DATA', 20);
        $withExif = substr($jpeg, 0, 2)."\xFF\xE1".pack('n', strlen($exif) + 2).$exif.substr($jpeg, 2);
        $this->assertStringContainsString('GPS-DATA', $withExif);
        $res = $this->post(self::API.'/alumni/me/', $this->payload(['photo' => UploadedFile::fake()->createWithContent('gps.jpg', $withExif)]))->assertCreated();
        $stored = Storage::disk('uploads')->get(AlumniProfile::findOrFail($res->json('id'))->photo);
        $this->assertStringNotContainsString('GPS-DATA', $stored);
    }

    public function test_rejects_fake_and_unsupported_images(): void
    {
        $shell = UploadedFile::fake()->createWithContent('shell.jpg', '<?php system($_GET[1]); ?>');
        $this->post(self::API.'/alumni/me/', $this->payload(['photo' => $shell]))->assertStatus(400)->assertJsonStructure(['photo']);
        $this->post(self::API.'/alumni/me/', $this->payload(['photo' => $this->image('gif', 50, 50, 'a.gif')]))->assertStatus(400);
        $big = UploadedFile::fake()->create('big.jpg', 6 * 1024);
        $this->post(self::API.'/alumni/me/', $this->payload(['photo' => $big]))->assertStatus(400);
        $this->assertSame([], Storage::disk('uploads')->allFiles());
    }

    public function test_identity_change_requires_re_review(): void
    {
        $profile = $this->makeProfile($this->user, status: 'approved', extra: ['full_name_en' => 'Rahim Uddin']);
        $this->post(self::API.'/alumni/me/update/', ['city' => 'Khulna'])->assertJsonPath('status', 'approved');
        $this->post(self::API.'/alumni/me/update/', ['full_name_en' => 'Someone Else'])->assertJsonPath('status', 'pending');
        $this->assertNull($profile->fresh()->approved_by);
    }

    public function test_rejected_profile_resubmits(): void
    {
        $this->makeProfile($this->user, status: 'rejected');
        $this->post(self::API.'/alumni/me/update/', ['roll' => '12'])->assertJsonPath('status', 'pending');
    }
}
