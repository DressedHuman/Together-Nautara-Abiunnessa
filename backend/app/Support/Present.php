<?php

namespace App\Support;

use App\Models\AlumniProfile;
use App\Models\ApprovalLog;
use App\Models\Batch;
use App\Models\BatchCoordinator;
use App\Models\User;

/**
 * JSON shapes returned by the API. They mirror frontend/src/types/index.ts,
 * so change both together.
 */
class Present
{
    public static function date($value): ?string
    {
        return $value?->toIso8601String();
    }

    public static function user(User $user): array
    {
        $profile = $user->profile;

        return [
            'id' => $user->id,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'is_verified' => $user->is_verified,
            'has_profile' => $profile !== null,
            'profile_status' => $profile?->status,
            'created_at' => static::date($user->created_at),
        ];
    }

    public static function publicUser(User $user): array
    {
        return ['id' => $user->id, 'email' => $user->email, 'phone' => $user->phone, 'role' => $user->role];
    }

    /** The owner's own profile. */
    public static function ownProfile(AlumniProfile $p): array
    {
        return [
            'id' => $p->id,
            'batch_year' => $p->batch->year,
            'batch_name' => $p->batch->display_name,
            ...$p->only(AlumniProfile::TEXT_FIELDS),
            'photo' => PhotoProcessor::url($p->photo),
            'status' => $p->status,
            'review_note' => $p->review_note,
            'recommended' => $p->recommended_by !== null,
            'created_at' => static::date($p->created_at),
            'updated_at' => static::date($p->updated_at),
        ];
    }

    /** A card in lists and the directory. */
    public static function card(AlumniProfile $p): array
    {
        return [
            'id' => $p->id,
            'full_name_en' => $p->full_name_en,
            'full_name_bn' => $p->full_name_bn,
            'batch_year' => $p->batch->year,
            'batch_name' => $p->batch->display_name,
            'profession' => $p->profession,
            'company' => $p->company,
            'city' => $p->city,
            'country' => $p->country,
            'photo' => PhotoProcessor::url($p->photo),
        ];
    }

    /** Public profile page. Contact links, roll and section are for members only. */
    public static function publicProfile(AlumniProfile $p, bool $isMember): array
    {
        $data = static::card($p) + ['university' => $p->university, 'bio' => $p->bio];
        if ($isMember) {
            $data += $p->only(['roll', 'section', 'facebook', 'linkedin']);
        }
        $data['members_only_hidden'] = ! $isMember;

        return $data;
    }

    /** What coordinators and the committee see when reviewing. */
    public static function review(AlumniProfile $p): array
    {
        return static::card($p) + [
            ...$p->only(['roll', 'section', 'university', 'bio', 'facebook', 'linkedin', 'status', 'review_note']),
            'email' => $p->user->email,
            'phone' => $p->user->phone,
            'recommended_by' => $p->recommender?->email,
            'recommended_at' => static::date($p->recommended_at),
            'approved_by' => $p->approver?->email,
            'created_at' => static::date($p->created_at),
            'updated_at' => static::date($p->updated_at),
        ];
    }

    public static function batch(Batch $b): array
    {
        return [
            'id' => $b->id,
            'year' => $b->year,
            'display_name' => $b->display_name,
            'alumni_count' => (int) ($b->alumni_count ?? 0),
        ];
    }

    public static function batchDetail(Batch $b): array
    {
        return static::batch($b) + [
            'coordinators' => $b->coordinators->map(fn (BatchCoordinator $c) => [
                'id' => $c->id,
                'user' => static::publicUser($c->user),
                'name' => $c->user->profile?->full_name_en,
                'created_at' => static::date($c->created_at),
            ])->values()->all(),
            'pending_count' => (int) ($b->pending_count ?? 0),
            'created_at' => static::date($b->created_at),
        ];
    }

    public static function log(ApprovalLog $log): array
    {
        return [
            'id' => $log->id,
            'alumni' => $log->alumni_id,
            'alumni_name' => $log->alumni->full_name_en,
            'batch_year' => $log->alumni->batch->year,
            'actor' => $log->actor?->email,
            'status' => $log->status,
            'note' => $log->note,
            'created_at' => static::date($log->created_at),
        ];
    }
}
