<?php

namespace Tests\Feature;

use App\Models\AlumniProfile;
use App\Models\Batch;
use App\Models\BatchCoordinator;
use App\Models\User;
use Tests\TestCase;

class CoordinatorTest extends TestCase
{
    private User $coord;

    private AlumniProfile $mine;

    private AlumniProfile $other;

    protected function setUp(): void
    {
        parent::setUp();
        $this->coord = $this->makeUser('co@example.com');
        BatchCoordinator::create(['batch_id' => Batch::create(['year' => 2015])->id, 'user_id' => $this->coord->id]);
        $this->coord->refresh();
        $this->mine = $this->makeProfile($this->makeUser('mate@example.com'), 2015);
        $this->other = $this->makeProfile($this->makeUser('far@example.com'), 2018);
    }

    public function test_sees_only_own_batches(): void
    {
        $this->login($this->coord);
        $res = $this->getJson(self::API.'/coordinator/batch-alumni/')->assertOk();
        $this->assertSame([$this->mine->id], array_column($res->json('results'), 'id'));
        $this->assertSame([2015], $res->json('batches'));
        $this->assertSame('mate@example.com', $res->json('results.0.email'));
    }

    public function test_recommend(): void
    {
        $this->login($this->coord);
        $this->postJson(self::API.'/coordinator/verify-alumni/', ['alumni_id' => $this->other->id])->assertNotFound();
        $this->postJson(self::API.'/coordinator/verify-alumni/', ['alumni_id' => 'nope'])->assertStatus(400);
        $this->postJson(self::API.'/coordinator/verify-alumni/', ['alumni_id' => $this->mine->id, 'note' => 'Classmate'])->assertOk();
        $this->mine->refresh();
        $this->assertSame($this->coord->id, $this->mine->recommended_by);
        $this->assertSame('pending', $this->mine->status);           // committee still decides
        $own = $this->makeProfile($this->coord, 2015);
        $this->postJson(self::API.'/coordinator/verify-alumni/', ['alumni_id' => $own->id])->assertStatus(400);

        $this->login($this->makeUser('boss@example.com', 'committee'));
        $this->getJson(self::API.'/approvals/pending/')->assertJsonPath('results.0.id', $this->mine->id)->assertJsonPath('results.0.recommended_by', 'co@example.com');
        $this->getJson(self::API.'/approvals/pending/?recommended=1')->assertJsonPath('total', 1);
    }
}
