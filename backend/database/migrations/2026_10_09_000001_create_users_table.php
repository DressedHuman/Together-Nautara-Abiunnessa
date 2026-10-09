<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email', 191)->unique();   // stored lower-case
            $table->string('phone', 20)->unique();    // stored as +<digits>
            $table->string('password');
            $table->string('role', 20)->default('alumni')->index();
            $table->boolean('is_verified')->default(false);
            $table->boolean('is_active')->default(true);
            // One-time code: only a hash is stored
            $table->string('otp_code')->nullable();
            $table->timestamp('otp_created_at')->nullable();
            $table->string('otp_purpose', 10)->default('');
            $table->unsignedTinyInteger('otp_attempts')->default(0);
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
        });

        Schema::create('api_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10);               // access | refresh
            $table->char('token_hash', 64)->unique(); // sha256 of the token
            $table->timestamp('expires_at')->index();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['user_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_tokens');
        Schema::dropIfExists('users');
    }
};
