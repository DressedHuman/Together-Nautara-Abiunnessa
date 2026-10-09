<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Audit trail of approvals, rejections and coordinator recommendations. */
class ApprovalLog extends Model
{
    use HasUuids;

    public const UPDATED_AT = null;

    protected $fillable = ['alumni_id', 'approved_by', 'status', 'note'];

    protected $attributes = ['note' => ''];

    public function alumni(): BelongsTo
    {
        return $this->belongsTo(AlumniProfile::class, 'alumni_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
