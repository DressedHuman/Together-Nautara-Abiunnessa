<?php

namespace Tests\Feature;

use App\Models\AlumniProfile;
use App\Models\ApprovalLog;
use App\Models\BatchCoordinator;
use App\Models\User;
use Tests\TestCase;

class CommitteeTest extends TestCase
{
    private User $committee;

    private User $alumnus;

    private AlumniProfile $profile;

    protected function setUp(): void
    {
        parent::setUp();
        $this->committee = $this->makeUser('boss@example.com', 'committee');
        $this->alumnus = $this->makeUser('al@example.com');
        $this->profile = $this->makeProfile($this->alumnus);
    }

    public function test_alumni_cannot_use_committee_endpoints(): void
    {
        $id = $this->profile->id;
        $endpoints = [
            ['get', 'approvals/pending/'], ['get', 'approvals/alumni/'], ['get', 'approvals/logs/'], ['get', 'approvals/stats/'],
            ['post', "approvals/{$id}/approve/"], ['post', "approvals/{$id}/reject/"], ['post', 'batches/'],
            ['patch', 'batches/2015/'], ['delete', 'batches/2015/'], ['post', 'batches/2015/coordinators/'],
            ['get', 'coordinator/batch-alumni/'], ['post', 'coordinator/verify-alumni/'],
        ];
        foreach ($endpoints as [$method, $path]) {
            $this->{$method.'Json'}(self::API.'/'.$path, [])->assertUnauthorized();
        }
        $this->login($this->alumnus);
        foreach ($endpoints as [$method, $path]) {
            $this->{$method.'Json'}(self::API.'/'.$path, [])->assertForbidden();
        }
        $this->assertSame('pending', $this->profile->fresh()->status);
    }

    public function test_approve_reject_flow(): void
    {
        $this->login($this->committee);
        $this->getJson(self::API.'/approvals/pending/')->assertJsonPath('total', 1)->assertJsonPath('results.0.email', 'al@example.com');

        $this->postJson(self::API."/approvals/{$this->profile->id}/reject/", ['note' => 'Add roll'])->assertOk();
        $this->assertSame(['rejected', 'Add roll'], [$this->profile->fresh()->status, $this->profile->fresh()->review_note]);
        $this->assertStringContainsString('Add roll', last($this->mails())['body']);

        $this->postJson(self::API."/approvals/{$this->profile->id}/approve/", [])->assertOk()->assertJsonPath('profile.status', 'approved');
        $this->assertSame($this->committee->id, $this->profile->fresh()->approved_by);
        $this->assertStringContainsString('verified your profile', last($this->mails())['body']);
        $this->postJson(self::API."/approvals/{$this->profile->id}/approve/", [])->assertStatus(400);   // not twice
        $this->postJson(self::API."/approvals/{$this->profile->id}/reject/", [])->assertOk();           // revoke
        $this->assertSame(3, ApprovalLog::where('alumni_id', $this->profile->id)->count());

        $this->getJson(self::API.'/approvals/logs/')->assertJsonPath('0.actor', 'boss@example.com')->assertJsonPath('0.alumni_name', 'Test Person');
        $this->getJson(self::API.'/approvals/stats/')->assertExactJson(['pending' => 0, 'approved' => 0, 'rejected' => 1, 'recommended' => 0]);
        $this->getJson(self::API.'/approvals/alumni/?status=rejected&search=AL@')->assertJsonPath('total', 1);
        $this->getJson(self::API.'/approvals/alumni/?search=+88017')->assertJsonPath('total', 1);
        $this->getJson(self::API."/alumni/{$this->profile->id}/")->assertJsonPath('email', 'al@example.com');
        $this->postJson(self::API.'/approvals/00000000-0000-0000-0000-000000000000/approve/')->assertNotFound();
    }

    public function test_batch_management(): void
    {
        $this->login($this->committee);
        $this->postJson(self::API.'/batches/', ['year' => (int) date('Y') + 5])->assertStatus(400)->assertJsonStructure(['year']);
        $this->postJson(self::API.'/batches/', ['year' => 2010, 'display_name' => 'SSC 2010'])->assertCreated()->assertJsonPath('display_name', 'SSC 2010');
        $this->postJson(self::API.'/batches/', ['year' => 2010])->assertStatus(400);
        $this->patchJson(self::API.'/batches/2010/', ['display_name' => 'Class of 2010'])->assertJsonPath('display_name', 'Class of 2010');
        $this->patchJson(self::API.'/batches/2010/', ['display_name' => ''])->assertJsonPath('display_name', 'Batch of 2010');
        $this->deleteJson(self::API.'/batches/2015/')->assertStatus(400);           // has profiles

        $this->postJson(self::API.'/batches/2015/coordinators/', ['email' => 'AL@example.com'])->assertCreated()->assertJsonPath('coordinators.0.user.email', 'al@example.com');
        $this->assertSame('coordinator', $this->alumnus->fresh()->role);
        $this->postJson(self::API.'/batches/2015/coordinators/', ['email' => 'al@example.com'])->assertStatus(400);
        $this->postJson(self::API.'/batches/2015/coordinators/', ['email' => 'ghost@example.com'])->assertStatus(400)->assertJsonStructure(['email']);
        $this->makeUser('unv@example.com', verified: false);
        $this->postJson(self::API.'/batches/2015/coordinators/', ['email' => 'unv@example.com'])->assertStatus(400);

        $link = BatchCoordinator::firstOrFail();
        $this->deleteJson(self::API."/batches/2015/coordinators/{$link->id}/")->assertOk()->assertJsonPath('coordinators', []);
        $this->assertSame('alumni', $this->alumnus->fresh()->role);

        $detail = $this->getJson(self::API.'/batches/?detail=1')->json();
        $this->assertArrayHasKey('pending_count', $detail[0]);
        $this->deleteJson(self::API.'/batches/2010/')->assertNoContent();
    }

    public function test_committee_member_stays_committee_when_made_coordinator(): void
    {
        $this->login($this->committee);
        $this->postJson(self::API.'/batches/2015/coordinators/', ['email' => 'boss@example.com'])->assertCreated();
        $this->assertSame('committee', $this->committee->fresh()->role);
    }
}
