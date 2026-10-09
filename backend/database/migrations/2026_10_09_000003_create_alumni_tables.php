<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alumni_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignUuid('batch_id')->constrained()->restrictOnDelete();
            $table->string('roll', 50)->default('');
            $table->string('section', 20)->default('');
            $table->string('full_name_bn', 200);
            $table->string('full_name_en', 200)->index();
            $table->string('city', 100)->default('');
            $table->string('country', 100)->default('')->index();
            $table->string('profession', 200)->default('')->index();
            $table->string('company', 200)->default('');
            $table->string('university', 200)->default('');
            $table->text('bio');
            $table->string('facebook', 255)->default('');
            $table->string('linkedin', 255)->default('');
            $table->string('photo')->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_note');
            $table->foreignUuid('recommended_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('recommended_at')->nullable();
            $table->timestamps();
        });

        Schema::create('approval_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumni_id')->constrained('alumni_profiles')->cascadeOnDelete();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->index();   // approved | rejected | recommended
            $table->text('note');
            $table->timestamp('created_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_logs');
        Schema::dropIfExists('alumni_profiles');
    }
};
