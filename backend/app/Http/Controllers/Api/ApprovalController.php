<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlumniProfile;
use App\Models\ApprovalLog;
use App\Support\Mailer;
use App\Support\Present;
use App\Support\Query;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApprovalController extends Controller
{
    /** Pending profiles: coordinator-recommended first, then oldest first. */
    public function pending(Request $request): JsonResponse
    {
        $query = $this->filtered($request, $this->base()->where('status', 'pending'))
            ->orderByRaw('CASE WHEN recommended_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('recommended_at')->orderBy('created_at');
        if ($request->query('recommended') === '1') {
            $query->whereNotNull('recommended_by');
        }

        return response()->json(Query::paginate($request, $query, Present::review(...)));
    }

    /** Every profile, filterable by status, batch and search. */
    public function alumni(Request $request): JsonResponse
    {
        $query = $this->filtered($request, $this->base());
        $status = Query::text($request, 'status', 20);
        if (in_array($status, AlumniProfile::STATUSES, true)) {
            $query->where('status', $status);
        }

        return response()->json(Query::paginate($request, $query->orderByDesc('updated_at'), Present::review(...)));
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        return $this->decide($request, $id, 'approved', ['pending', 'rejected'], 'Alumni approved.');
    }

    /** Reject a pending profile, or revoke an approved one. */
    public function reject(Request $request, string $id): JsonResponse
    {
        return $this->decide($request, $id, 'rejected', ['pending', 'approved'], 'Alumni rejected.');
    }

    public function logs(Request $request): JsonResponse
    {
        $query = ApprovalLog::with(['alumni.batch', 'actor'])->orderByDesc('created_at');
        if (($status = Query::text($request, 'status', 20)) !== '') {
            $query->where('status', $status);
        }
        if (($alumni = Query::text($request, 'alumni', 40)) !== '') {
            $query->where('alumni_id', $alumni);
        }
        $limit = Query::int($request, 'limit', 50, 1, 200);

        return response()->json($query->limit($limit)->get()->map(Present::log(...)));
    }

    public function stats(): JsonResponse
    {
        $counts = ['pending' => 0, 'approved' => 0, 'rejected' => 0];
        foreach (AlumniProfile::selectRaw('status, count(*) as n')->groupBy('status')->get() as $row) {
            $counts[$row->status] = (int) $row->n;
        }
        $counts['recommended'] = AlumniProfile::where('status', 'pending')->whereNotNull('recommended_by')->count();

        return response()->json($counts);
    }

    private function decide(Request $request, string $id, string $status, array $from, string $message): JsonResponse
    {
        $data = $request->validate(['note' => 'nullable|string|max:1000']);
        $note = trim((string) ($data['note'] ?? ''));
        $actor = $request->user();

        $result = DB::transaction(function () use ($id, $status, $from, $note, $actor) {
            $profile = AlumniProfile::lockForUpdate()->findOrFail($id);
            if (! in_array($profile->status, $from, true)) {
                return response()->json(['detail' => "A {$profile->status} profile cannot be {$status}."], 400);
            }
            $profile->forceFill([
                'status' => $status,
                'approved_by' => $status === 'approved' ? $actor->id : null,
                'review_note' => $note,
            ])->save();
            ApprovalLog::create(['alumni_id' => $profile->id, 'approved_by' => $actor->id, 'status' => $status, 'note' => $note]);

            return $profile;
        });
        if ($result instanceof JsonResponse) {
            return $result;
        }
        Mailer::status($result->load('user'), $status === 'approved', $note);

        return response()->json([
            'message' => $message,
            'profile' => Present::review($result->load(['batch', 'recommender', 'approver'])),
        ]);
    }

    private function base(): Builder
    {
        return AlumniProfile::with(['batch', 'user', 'recommender', 'approver']);
    }

    private function filtered(Request $request, Builder $query): Builder
    {
        if ($batch = Query::int($request, 'batch')) {
            $query->whereHas('batch', fn ($q) => $q->where('year', $batch));
        }
        $search = Query::text($request, 'search') ?: Query::text($request, 'name');
        if ($search !== '') {
            Query::search($query, ['full_name_en', 'full_name_bn', 'roll', 'user.email', 'user.phone'], $search);
        }

        return $query;
    }
}
