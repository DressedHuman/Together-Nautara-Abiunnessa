<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlumniProfile;
use App\Support\Present;
use App\Support\Query;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DirectoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AlumniProfile::with('batch')->where('status', 'approved');

        if (($search = Query::text($request, 'search')) !== '') {
            Query::search($query, ['full_name_en', 'full_name_bn', 'profession', 'company', 'university'], $search);
        }
        if ($batch = Query::int($request, 'batch')) {
            $query->whereHas('batch', fn ($q) => $q->where('year', $batch));
        }
        foreach (['profession', 'country', 'city'] as $field) {
            if (($value = Query::text($request, $field)) !== '') {
                Query::search($query, [$field], $value);
            }
        }

        match ($request->query('ordering')) {
            'batch' => $this->byBatch($query, 'asc'),
            '-batch' => $this->byBatch($query, 'desc'),
            'recent' => $query->orderByDesc('updated_at'),
            default => $query->orderBy('full_name_en'),
        };

        return response()->json(Query::paginate($request, $query, Present::card(...), 12));
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return self::publicProfile($request, $id);
    }

    public static function publicProfile(Request $request, string $id): JsonResponse
    {
        $profile = AlumniProfile::with('batch')->where('status', 'approved')->find($id);
        if (! $profile) {
            return response()->json(['detail' => 'Profile not found'], 404);
        }
        $viewer = $request->user();
        $isMember = $viewer && ($viewer->isCommittee() || $viewer->isApprovedAlumnus());

        return response()->json(Present::publicProfile($profile, $isMember));
    }

    public function filters(): JsonResponse
    {
        $approved = fn () => AlumniProfile::query()->where('status', 'approved');
        $distinct = function (string $field, ?int $limit = null) use ($approved) {
            $rows = $approved()->where($field, '!=', '')
                ->selectRaw("{$field} as value, count(*) as n")->groupBy($field)
                ->orderByDesc('n')->orderBy($field);
            if ($limit) {
                $rows->limit($limit);
            }

            return $rows->pluck('value')->map(fn ($v) => trim($v))->unique(fn ($v) => mb_strtolower($v))
                ->sortBy(fn ($v) => mb_strtolower($v))->values()->all();
        };

        return response()->json([
            'batches' => $approved()->join('batches', 'batches.id', '=', 'alumni_profiles.batch_id')
                ->distinct()->orderByDesc('batches.year')->pluck('batches.year')->map(fn ($y) => (int) $y)->all(),
            'professions' => $distinct('profession', 50),
            'countries' => $distinct('country'),
            'cities' => $distinct('city', 50),
        ]);
    }

    public function stats(): JsonResponse
    {
        $approved = fn () => AlumniProfile::query()->where('status', 'approved');

        return response()->json([
            'alumni' => $approved()->count(),
            'batches' => $approved()->distinct()->count('batch_id'),
            'countries' => $approved()->where('country', '!=', '')->distinct()->count('country'),
            'professions' => $approved()->where('profession', '!=', '')->distinct()->count('profession'),
        ]);
    }

    private function byBatch($query, string $direction): void
    {
        $query->join('batches', 'batches.id', '=', 'alumni_profiles.batch_id')
            ->select('alumni_profiles.*')
            ->orderBy('batches.year', $direction)
            ->orderBy('alumni_profiles.full_name_en');
    }
}
