<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedSmallInteger('year')->unique();
            $table->string('display_name', 100);
            $table->timestamps();
        });

        Schema::create('batch_coordinators', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('batch_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->unique(['batch_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('batch_coordinators');
        Schema::dropIfExists('batches');
    }
};
