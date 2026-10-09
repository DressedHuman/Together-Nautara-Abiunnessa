<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Batch extends Model
{
    use HasUuids;

    protected $fillable = ['year', 'display_name'];

    protected function casts(): array
    {
        return ['year' => 'integer'];
    }

    protected static function booted(): void
    {
        static::saving(function (Batch $batch) {
            if (trim((string) $batch->display_name) === '') {
                $batch->display_name = "Batch of {$batch->year}";
            }
        });
    }

    public function profiles(): HasMany
    {
        return $this->hasMany(AlumniProfile::class);
    }

    public function coordinators(): HasMany
    {
        return $this->hasMany(BatchCoordinator::class);
    }
}
