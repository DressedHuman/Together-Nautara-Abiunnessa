<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class DatabaseSeeder extends Seeder
{
    /** `php artisan db:seed` adds the fictional demo alumni (local only). */
    public function run(): void
    {
        Artisan::call('together:seed-demo', [], $this->command->getOutput());
    }
}
