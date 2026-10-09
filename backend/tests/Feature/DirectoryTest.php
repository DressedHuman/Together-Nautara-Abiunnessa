<?php

namespace Tests\Feature;

use App\Models\AlumniProfile;
use Tests\TestCase;

class DirectoryTest extends TestCase
{
    private AlumniProfile $approved;

    private AlumniProfile $pending;

    protected function setUp(): void
    {
        parent::setUp();
        $this->approved = $this->makeProfile($this->makeUser('a@example.com'), status: 'approved', extra: [
            'full_name_en' => 'Alpha Approved', 'facebook' => 'https://facebook.com/alpha', 'roll' => '7',
            'profession' => 'Doctor', 'country' => 'Japan',
        ]);
        $this->pending = $this->makeProfile($this->makeUser('p@example.com'), extra: ['full_name_en' => 'Pending Person']);
        $this->makeProfile($this->makeUser('r@example.com'), 2016, 'rejected', ['full_name_en' => 'Rejected Person']);
    }

    public function test_only_approved_listed(): void
    {
        $res = $this->getJson(self::API.'/directory/')->assertOk();
        $this->assertSame(['Alpha Approved'], array_column($res->json('results'), 'full_name_en'));
        $this->assertArrayNotHasKey('email', $res->json('results.0'));
        $this->assertArrayNotHasKey('phone', $res->json('results.0'));
        $this->assertArrayNotHasKey('facebook', $res->json('results.0'));
        $this->getJson(self::API.'/directory/'.$this->pending->id.'/')->assertNotFound();
        $this->getJson(self::API.'/alumni/'.$this->pending->id.'/')->assertNotFound();
        $this->getJson(self::API.'/alumni/not-a-uuid/')->assertNotFound();
    }

    public function test_filters_sorting_and_bad_params(): void
    {
        $this->makeProfile($this->makeUser('b@example.com'), 2010, 'approved', ['full_name_en' => 'Beta Older']);
        $this->assertSame(1, $this->getJson(self::API.'/directory/?search=DOCTOR')->json('total'));
        $this->assertSame(1, $this->getJson(self::API.'/directory/?country=japan&batch=2015')->json('total'));
        $this->assertSame(0, $this->getJson(self::API.'/directory/?batch=1999')->json('total'));
        $this->assertSame(0, $this->getJson(self::API.'/directory/?search=%25')->json('total'));      // % is literal
        $this->assertSame(['Beta Older', 'Alpha Approved'], array_column($this->getJson(self::API.'/directory/?ordering=batch')->json('results'), 'full_name_en'));
        $this->assertSame(['Alpha Approved', 'Beta Older'], array_column($this->getJson(self::API.'/directory/?ordering=-batch')->json('results'), 'full_name_en'));
        $this->getJson(self::API.'/directory/?page=abc')->assertStatus(400)->assertJsonStructure(['page']);
        $this->getJson(self::API.'/directory/?page=999')->assertOk()->assertJsonPath('current_page', 1);
        $this->getJson(self::API.'/directory/?page_size=100000')->assertOk();
        $this->getJson(self::API.'/directory/?page_size=1')->assertJsonPath('pages', 2)->assertJsonPath('has_next', true);

        $filters = $this->getJson(self::API.'/directory/filters/')->json();
        $this->assertSame([2015, 2010], $filters['batches']);
        $this->assertSame(['Japan'], $filters['countries']);
        $this->assertSame(['alumni' => 2, 'batches' => 2, 'countries' => 1, 'professions' => 1], $this->getJson(self::API.'/directory/stats/')->json());
    }

    public function test_contact_links_are_members_only(): void
    {
        $url = self::API.'/directory/'.$this->approved->id.'/';
        $res = $this->getJson($url)->assertOk()->assertJsonPath('members_only_hidden', true);
        $this->assertArrayNotHasKey('facebook', $res->json());
        $this->assertArrayNotHasKey('roll', $res->json());

        $this->login($this->pending->user);                            // a pending member still can't
        $this->assertArrayNotHasKey('facebook', $this->getJson($url)->json());

        $viewer = $this->makeProfile($this->makeUser('v@example.com'), status: 'approved');
        $this->login($viewer->user);
        $res = $this->getJson($url)->assertJsonPath('facebook', 'https://facebook.com/alpha')->assertJsonPath('roll', '7');
        $this->assertArrayNotHasKey('email', $res->json());
    }

    public function test_owner_sees_own_pending_profile(): void
    {
        $this->login($this->pending->user);
        $this->getJson(self::API.'/alumni/'.$this->pending->id.'/')->assertOk()->assertJsonPath('status', 'pending');
    }

    public function test_public_batches_count_approved_only(): void
    {
        $counts = collect($this->getJson(self::API.'/batches/')->json())->pluck('alumni_count', 'year')->all();
        $this->assertSame([2016 => 0, 2015 => 1], $counts);
        $this->getJson(self::API.'/batches/2015/alumni/')->assertJsonPath('total', 1);
        $this->getJson(self::API.'/batches/2015/')->assertOk()->assertJsonMissingPath('coordinators');
        $this->getJson(self::API.'/batches/1999/')->assertNotFound();
    }
}
