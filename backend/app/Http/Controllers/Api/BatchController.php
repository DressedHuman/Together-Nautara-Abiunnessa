<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlumniProfile;
use App\Models\Batch;
use App\Models\BatchCoordinator;
use App\Models\User;
use App\Support\Present;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BatchController extends Controller
{
    /** Public: batches with approved-member counts. Committee + ?detail=1: with coordinators. */
    public function index(Request $request): JsonResponse
    {
        if ($request->user()?->isCommittee() && $request->query('detail')) {
            return response()->json(static::detailed()->orderByDesc('year')->get()->map(Present::batchDetail(...)));
        }
        $batches = Batch::withCount(['profiles as alumni_count' => fn ($q) => $q->where('status', 'approved')])
            ->orderByDesc('year')->get();

        return response()->json($batches->map(Present::batch(...)));
    }

    public function show(Request $request, int $year): JsonResponse
    {
        $batch = static::detailed()->where('year', $year)->firstOrFail();

        return response()->json($request->user()?->isCommittee() ? Present::batchDetail($batch) : Present::batch($batch));
    }

    public function alumni(int $year): JsonResponse
    {
        $batch = Batch::withCount(['profiles as alumni_count' => fn ($q) => $q->where('status', 'approved')])
            ->where('year', $year)->firstOrFail();
        $alumni = AlumniProfile::with('batch')->where('batch_id', $batch->id)->where('status', 'approved')
            ->orderBy('full_name_en')->get();

        return response()->json([
            'batch' => Present::batch($batch),
            'alumni' => $alumni->map(Present::card(...))->values(),
            'total' => $alumni->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, true);
        if (Batch::where('year', $data['year'])->exists()) {
            throw ValidationException::withMessages(['year' => 'This batch already exists.']);
        }
        $batch = Batch::create($data);

        return response()->json(Present::batchDetail(static::detailed()->findOrFail($batch->id)), 201);
    }

    public function update(Request $request, int $year): JsonResponse
    {
        $batch = Batch::where('year', $year)->firstOrFail();
        $batch->update(['display_name' => $this->validated($request, false)['display_name'] ?? '']);

        return response()->json(Present::batchDetail(static::detailed()->findOrFail($batch->id)));
    }

    public function destroy(int $year): JsonResponse
    {
        $batch = Batch::where('year', $year)->firstOrFail();
        if ($batch->profiles()->exists()) {
            return response()->json(['detail' => 'This batch still has alumni profiles and cannot be deleted.'], 400);
        }
        DB::transaction(function () use ($batch) {
            $users = $batch->coordinators()->with('user')->get()->pluck('user');
            $batch->delete();
            $users->each(fn (User $u) => static::demoteIfNoBatches($u));
        });

        return response()->json(null, 204);
    }

    public function addCoordinator(Request $request, int $year): JsonResponse
    {
        $batch = Batch::where('year', $year)->firstOrFail();
        $email = strtolower(trim((string) $request->input('email', '')));
        $user = $email !== '' ? User::where('email', $email)->where('is_active', true)->first() : null;
        if (! $user) {
            throw ValidationException::withMessages(['email' => 'No active account uses this email.']);
        }
        if (! $user->is_verified) {
            throw ValidationException::withMessages(['email' => 'That account has not verified its email yet.']);
        }
        if (BatchCoordinator::where('batch_id', $batch->id)->where('user_id', $user->id)->exists()) {
            throw ValidationException::withMessages(['email' => 'Already a coordinator of this batch.']);
        }
        BatchCoordinator::create(['batch_id' => $batch->id, 'user_id' => $user->id]);

        return response()->json(Present::batchDetail(static::detailed()->findOrFail($batch->id)), 201);
    }

    public function removeCoordinator(int $year, string $id): JsonResponse
    {
        $link = BatchCoordinator::with('user')->whereHas('batch', fn ($q) => $q->where('year', $year))->findOrFail($id);
        DB::transaction(function () use ($link) {
            $link->delete();
            static::demoteIfNoBatches($link->user);
        });

        return response()->json(Present::batchDetail(static::detailed()->where('year', $year)->firstOrFail()));
    }

    public static function demoteIfNoBatches(User $user): void
    {
        if ($user->role === 'coordinator' && ! $user->coordinatedBatches()->exists()) {
            $user->forceFill(['role' => 'alumni'])->save();
        }
    }

    private static function detailed(): Builder
    {
        return Batch::query()
            ->withCount([
                'profiles as alumni_count' => fn ($q) => $q->where('status', 'approved'),
                'profiles as pending_count' => fn ($q) => $q->where('status', 'pending'),
            ])
            ->with('coordinators.user.profile');
    }

    private function validated(Request $request, bool $creating): array
    {
        $latest = (int) date('Y') + 1;
        $first = config('together.first_batch_year');
        $data = $request->validate([
            'year' => $creating ? ['required', 'integer', "between:{$first},{$latest}"] : ['prohibited'],
            'display_name' => ['nullable', 'string', 'max:100'],
        ], ['year.between' => "Year must be between {$first} and {$latest}.", 'year.integer' => "Year must be between {$first} and {$latest}."]);
        $data['display_name'] = trim((string) ($data['display_name'] ?? ''));

        return $data;
    }
}
