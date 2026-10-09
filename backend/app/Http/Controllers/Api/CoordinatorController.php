<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlumniProfile;
use App\Models\ApprovalLog;
use App\Models\Batch;
use App\Models\User;
use App\Support\Present;
use App\Support\Query;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoordinatorController extends Controller
{
    /** Every profile (any status) in the batches the user coordinates. */
    public function batchAlumni(Request $request): JsonResponse
    {
        $user = $request->user();
        $batchIds = static::batchIds($user);
        $query = AlumniProfile::with(['batch', 'user', 'recommender', 'approver'])
            ->when($batchIds !== null, fn ($q) => $q->whereIn('batch_id', $batchIds))
            ->orderBy('status')->orderBy('full_name_en');

        $status = Query::text($request, 'status', 20);
        if (in_array($status, AlumniProfile::STATUSES, true)) {
            $query->where('status', $status);
        }
        if (($search = Query::text($request, 'search')) !== '') {
            Query::search($query, ['full_name_en', 'full_name_bn', 'roll'], $search);
        }

        $payload = Query::paginate($request, $query, Present::review(...));
        $payload['batches'] = $batchIds === null ? [] : Batch::whereIn('id', $batchIds)->orderByDesc('year')->pluck('year')->all();

        return response()->json($payload);
    }

    /** A coordinator vouches for a pending batchmate; the committee still decides. */
    public function recommend(Request $request): JsonResponse
    {
        $data = $request->validate(['alumni_id' => 'required|uuid', 'note' => 'nullable|string|max:1000']);
        $user = $request->user();
        $batchIds = static::batchIds($user);
        $profile = AlumniProfile::query()
            ->when($batchIds !== null, fn ($q) => $q->whereIn('batch_id', $batchIds))
            ->find($data['alumni_id']);

        if (! $profile) {
            return response()->json(['detail' => 'Profile not found in your batches.'], 404);
        }
        if ($profile->status !== 'pending') {
            return response()->json(['detail' => 'Only pending profiles can be recommended.'], 400);
        }
        if ($profile->user_id === $user->id) {
            return response()->json(['detail' => 'You cannot recommend your own profile.'], 400);
        }
        $profile->forceFill(['recommended_by' => $user->id, 'recommended_at' => now()])->save();
        ApprovalLog::create([
            'alumni_id' => $profile->id, 'approved_by' => $user->id, 'status' => 'recommended',
            'note' => trim((string) ($data['note'] ?? '')),
        ]);

        return response()->json(['message' => 'Recommended to the committee.']);
    }

    /** Batch ids the user coordinates; null means all (committee). */
    private static function batchIds(User $user): ?array
    {
        return $user->isCommittee() ? null : $user->coordinatedBatches()->pluck('batch_id')->all();
    }
}
