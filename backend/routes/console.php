<?php

use App\Support\Tokens;
use Illuminate\Support\Facades\Artisan;

Artisan::command('together:prune-tokens', function () {
    Tokens::prune();
    $this->info('Expired sessions removed.');
})->purpose('Delete expired access and refresh tokens');
