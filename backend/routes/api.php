<?php

use App\Http\Controllers\Api\AlumniController;
use App\Http\Controllers\Api\ApprovalController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\CoordinatorController;
use App\Http\Controllers\Api\DirectoryController;
use App\Http\Controllers\Api\ProfileController;
use Illuminate\Support\Facades\Route;

// Every URL also works with a trailing slash (the frontend uses /api/v1/.../).
Route::prefix('v1')->middleware('throttle:api')->group(function () {
    Route::get('/', fn () => response()->json([
        'version' => 'v1',
        'endpoints' => collect(['auth', 'alumni', 'directory', 'batches', 'coordinator', 'approvals'])
            ->mapWithKeys(fn ($e) => [$e => url("/api/v1/{$e}/")]),
    ]));

    // ---- Auth -------------------------------------------------------------
    Route::prefix('auth')->controller(AuthController::class)->group(function () {
        Route::post('register', 'register')->middleware('throttle:register');
        Route::post('login-email', 'loginEmail')->middleware('throttle:login');
        Route::post('login-phone', 'loginPhone')->middleware('throttle:login');
        Route::post('refresh-token', 'refresh')->middleware('throttle:login');
        Route::post('request-otp', 'requestOtp')->middleware('throttle:otp');
        Route::post('verify-otp', 'verifyOtp')->middleware('throttle:otp');
        Route::post('password-reset', 'requestReset')->middleware('throttle:otp');
        Route::post('password-reset/confirm', 'confirmReset')->middleware('throttle:otp');
        Route::post('logout', 'logout');
        Route::middleware('auth')->group(function () {
            Route::get('me', 'me');
            Route::post('change-password', 'changePassword');
        });
    });

    // ---- Own profile ------------------------------------------------------
    Route::prefix('alumni/me')->middleware(['auth', 'verified.account'])->controller(ProfileController::class)->group(function () {
        Route::get('/', 'show');
        Route::post('/', 'store');
        Route::match(['put', 'patch'], '/', 'update');
        Route::post('update', 'update');   // multipart: PHP only parses file uploads on POST
    });
    Route::get('alumni/{id}', [AlumniController::class, 'show'])->whereUuid('id');

    // ---- Public directory -------------------------------------------------
    Route::prefix('directory')->controller(DirectoryController::class)->group(function () {
        Route::get('/', 'index');
        Route::get('filters', 'filters');
        Route::get('stats', 'stats');
        Route::get('{id}', 'show')->whereUuid('id');
    });

    // ---- Batches ----------------------------------------------------------
    Route::prefix('batches')->controller(BatchController::class)->group(function () {
        Route::get('/', 'index');
        Route::get('{year}', 'show')->whereNumber('year');
        Route::get('{year}/alumni', 'alumni')->whereNumber('year');
        Route::middleware(['auth', 'role:committee'])->group(function () {
            Route::post('/', 'store');
            Route::patch('{year}', 'update')->whereNumber('year');
            Route::delete('{year}', 'destroy')->whereNumber('year');
            Route::post('{year}/coordinators', 'addCoordinator')->whereNumber('year');
            Route::delete('{year}/coordinators/{id}', 'removeCoordinator')->whereNumber('year')->whereUuid('id');
        });
    });

    // ---- Coordinators -----------------------------------------------------
    Route::prefix('coordinator')->middleware(['auth', 'role:coordinator,committee'])->controller(CoordinatorController::class)->group(function () {
        Route::get('batch-alumni', 'batchAlumni');
        Route::post('verify-alumni', 'recommend');
    });

    // ---- Committee --------------------------------------------------------
    Route::prefix('approvals')->middleware(['auth', 'role:committee'])->controller(ApprovalController::class)->group(function () {
        Route::get('pending', 'pending');
        Route::get('alumni', 'alumni');
        Route::get('stats', 'stats');
        Route::get('logs', 'logs');
        Route::post('{id}/approve', 'approve')->whereUuid('id');
        Route::post('{id}/reject', 'reject')->whereUuid('id');
    });
});
