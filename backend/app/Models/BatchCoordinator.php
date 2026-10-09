<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BatchCoordinator extends Model
{
    use HasUuids;

    public const UPDATED_AT = null;

    protected $fillable = ['batch_id', 'user_id'];

    protected static function booted(): void
    {
        // Plain alumni become coordinators; committee members keep their role.
        static::created(function (BatchCoordinator $link) {
            $user = $link->user;
            if ($user->role === 'alumni') {
                $user->forceFill(['role' => 'coordinator'])->save();
            }
        });
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
