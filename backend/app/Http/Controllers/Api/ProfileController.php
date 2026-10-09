<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlumniProfile;
use App\Models\Batch;
use App\Support\PhotoProcessor;
use App\Support\Present;
use App\Support\Social;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    private const LIMITS = [
        'roll' => 50, 'section' => 20, 'full_name_bn' => 200, 'full_name_en' => 200, 'city' => 100,
        'country' => 100, 'profession' => 200, 'company' => 200, 'university' => 200, 'bio' => 1000,
        'facebook' => 255, 'linkedin' => 255,
    ];

    public function show(Request $request): JsonResponse
    {
        $profile = $this->mine($request);
        if (! $profile) {
            return response()->json(['detail' => 'Profile not found'], 404);
        }

        return response()->json(Present::ownProfile($profile));
    }

    public function store(Request $request): JsonResponse
    {
        if ($this->mine($request)) {
            return response()->json(['detail' => 'Profile already exists'], 400);
        }
        $data = $this->validated($request, creating: true);
        $profile = new AlumniProfile(['user_id' => $request->user()->id]);
        $this->save($profile, $data, $request);

        return response()->json(Present::ownProfile($profile->fresh(['batch'])), 201);
    }

    /** PUT/PATCH (JSON) or POST /alumni/me/update/ (multipart, for photo uploads). */
    public function update(Request $request): JsonResponse
    {
        $profile = $this->mine($request);
        if (! $profile) {
            return response()->json(['detail' => 'Profile not found'], 404);
        }
        $data = $this->validated($request, creating: false);

        $identityChanged = collect(AlumniProfile::IDENTITY_FIELDS)
            ->contains(fn ($f) => array_key_exists($f, $data) && (string) $profile->{$f} !== (string) $data[$f]);
        if ($profile->status === 'rejected' || ($profile->status === 'approved' && $identityChanged)) {
            $profile->status = 'pending';
            $profile->approved_by = null;
            $profile->recommended_by = null;
            $profile->recommended_at = null;
        }
        $this->save($profile, $data, $request);

        return response()->json(Present::ownProfile($profile->fresh(['batch'])));
    }

    private function mine(Request $request): ?AlumniProfile
    {
        return AlumniProfile::with('batch')->where('user_id', $request->user()->id)->first();
    }

    /** Validate and normalize input; only fields that were sent are returned on update. */
    private function validated(Request $request, bool $creating): array
    {
        $latest = (int) date('Y') + 1;
        $first = config('together.first_batch_year');
        $req = $creating ? 'required' : 'sometimes';
        $rules = [
            'batch_year' => [$req, 'integer', "between:{$first},{$latest}"],
            'full_name_en' => [$req, 'string', 'max:200'],
            'full_name_bn' => [$req, 'string', 'max:200'],
            'photo' => ['nullable', 'file'],
            'remove_photo' => ['nullable', 'in:true,false,1,0'],
        ];
        foreach (self::LIMITS as $field => $max) {
            $rules[$field] ??= ['sometimes', 'nullable', 'string', "max:{$max}"];
        }
        $request->validate($rules, [
            'batch_year.between' => "Enter an SSC year between {$first} and {$latest}.",
            'batch_year.integer' => "Enter an SSC year between {$first} and {$latest}.",
            'batch_year.required' => 'Enter your SSC year.',
            'full_name_en.required' => 'Name in English is required.',
            'full_name_bn.required' => 'Name in Bangla is required.',
        ]);

        $data = [];
        foreach (array_keys(self::LIMITS) as $field) {
            if ($request->has($field)) {
                $data[$field] = trim((string) $request->input($field));
            }
        }
        $errors = [];
        foreach (['full_name_en' => 'Name in English', 'full_name_bn' => 'Name in Bangla'] as $field => $label) {
            if (array_key_exists($field, $data) && mb_strlen($data[$field]) < 2) {
                $errors[$field] = "{$label} is required.";
            }
        }
        foreach (['facebook', 'linkedin'] as $network) {
            if (array_key_exists($network, $data)) {
                try {
                    $data[$network] = Social::clean($data[$network], $network);
                } catch (ValidationException $e) {
                    $errors[$network] = $e->errors()[$network][0];
                }
            }
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
        if ($request->has('batch_year')) {
            $data['batch_id'] = Batch::firstOrCreate(['year' => (int) $request->input('batch_year')])->id;
        }

        return $data;
    }

    private function save(AlumniProfile $profile, array $data, Request $request): void
    {
        $newPhoto = $request->hasFile('photo') ? PhotoProcessor::store($request->file('photo')) : null;
        $remove = in_array($request->input('remove_photo'), ['true', '1', 1, true], true);
        $old = $profile->photo;

        DB::transaction(function () use ($profile, $data, $newPhoto, $remove) {
            $profile->fill($data);
            if ($newPhoto || $remove) {
                $profile->photo = $newPhoto;
            }
            $profile->save();
        });
        if (($newPhoto || $remove) && $old) {
            PhotoProcessor::delete($old);
        }
    }
}
