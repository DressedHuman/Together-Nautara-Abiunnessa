<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AlumniProfile extends Model
{
    use HasUuids;

    public const STATUSES = ['pending', 'approved', 'rejected'];

    /** Changing any of these on an approved profile sends it back for review. */
    public const IDENTITY_FIELDS = ['batch_id', 'roll', 'section', 'full_name_bn', 'full_name_en'];

    public const TEXT_FIELDS = [
        'roll', 'section', 'full_name_bn', 'full_name_en', 'city', 'country',
        'profession', 'company', 'university', 'bio', 'facebook', 'linkedin',
    ];

    protected $fillable = [
        'user_id', 'batch_id', 'roll', 'section', 'full_name_bn', 'full_name_en', 'city', 'country',
        'profession', 'company', 'university', 'bio', 'facebook', 'linkedin',
    ];

    protected $attributes = [
        'roll' => '', 'section' => '', 'city' => '', 'country' => '', 'profession' => '', 'company' => '',
        'university' => '', 'bio' => '', 'facebook' => '', 'linkedin' => '', 'status' => 'pending', 'review_note' => '',
    ];

    protected function casts(): array
    {
        return ['recommended_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function recommender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recommended_by');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(ApprovalLog::class, 'alumni_id');
    }
}
