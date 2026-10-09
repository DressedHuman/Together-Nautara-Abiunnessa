<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Phone;
use Illuminate\Console\Command;

/** Create or promote a committee member (the site has no other admin panel). */
class MakeCommittee extends Command
{
    protected $signature = 'together:committee {email} {--phone= : Needed when the account does not exist yet} {--demote : Make the user a plain alumnus again}';

    protected $description = 'Give an account committee access (creating it if needed)';

    public function handle(): int
    {
        $email = strtolower(trim($this->argument('email')));
        $user = User::where('email', $email)->first();

        if ($this->option('demote')) {
            if (! $user) {
                $this->error('No account uses that email.');

                return self::FAILURE;
            }
            $user->forceFill(['role' => $user->coordinatedBatches()->exists() ? 'coordinator' : 'alumni'])->save();
            $this->info("{$email} is no longer on the committee.");

            return self::SUCCESS;
        }

        if (! $user) {
            $phone = Phone::normalize($this->option('phone') ?: $this->ask('Phone number'));
            if (! $phone || User::where('phone', $phone)->exists()) {
                $this->error('Enter a valid phone number that is not used by another account.');

                return self::FAILURE;
            }
            $password = $this->secret('Password (at least 8 characters)');
            if (mb_strlen((string) $password) < 8) {
                $this->error('Password is too short.');

                return self::FAILURE;
            }
            $user = User::create(['email' => $email, 'phone' => $phone, 'password' => $password]);
        }
        $user->forceFill(['role' => 'committee', 'is_verified' => true, 'is_active' => true])->save();
        $this->info("{$email} now has committee access.");

        return self::SUCCESS;
    }
}
