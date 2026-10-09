<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlumniProfile;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlumniController extends Controller
{
    /** The full record for its owner and the committee, otherwise the public view. */
    public function show(Request $request, string $id): JsonResponse
    {
        $viewer = $request->user();
        $profile = AlumniProfile::with(['batch', 'user', 'recommender', 'approver'])->find($id);
        if ($profile && $viewer?->isCommittee()) {
            return response()->json(Present::review($profile));
        }
        if ($profile && $viewer && $profile->user_id === $viewer->id) {
            return response()->json(Present::ownProfile($profile));
        }

        return DirectoryController::publicProfile($request, $id);
    }
}
