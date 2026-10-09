<?php

namespace App\Console\Commands;

use App\Models\AlumniProfile;
use App\Models\Batch;
use App\Models\BatchCoordinator;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Fill a development database with fictional alumni. */
class SeedDemo extends Command
{
    protected $signature = 'together:seed-demo {--password= : Password for every demo account (default: random, printed)} {--force : Allow outside the local environment}';

    protected $description = 'Create fictional demo alumni, a committee member and a coordinator';

    private const PEOPLE = [
        ['Farhana Akter', 'ফারহানা আক্তার', 'Physician', 'Dhaka Medical College Hospital', 'Dhaka Medical College', 'Dhaka', 'Bangladesh'],
        ['Tanvir Hasan', 'তানভীর হাসান', 'Software Engineer', 'Grameenphone', 'BUET', 'Dhaka', 'Bangladesh'],
        ['Nusrat Jahan', 'নুসরাত জাহান', 'Lecturer', 'University of Rajshahi', 'University of Rajshahi', 'Rajshahi', 'Bangladesh'],
        ['Mahmudul Islam', 'মাহমুদুল ইসলাম', 'Civil Engineer', 'LGED', 'RUET', 'Rajshahi', 'Bangladesh'],
        ['Sabrina Rahman', 'সাবরিনা রহমান', 'Data Scientist', 'Shopify', 'University of Toronto', 'Toronto', 'Canada'],
        ['Rakibul Hasan', 'রাকিবুল হাসান', 'Entrepreneur', 'Barind Agro Ltd.', 'University of Rajshahi', 'Naogaon', 'Bangladesh'],
        ['Sharmin Sultana', 'শারমিন সুলতানা', 'Teacher', 'Nautara Abiunnessa B.L. High School', 'Rajshahi College', 'Rangpur', 'Bangladesh'],
        ['Arif Hossain', 'আরিফ হোসেন', 'Banker', 'Sonali Bank', 'Jahangirnagar University', 'Dhaka', 'Bangladesh'],
        ['Mim Chowdhury', 'মীম চৌধুরী', 'Architect', 'Foster + Partners', 'University College London', 'London', 'United Kingdom'],
        ['Shakil Ahmed', 'শাকিল আহমেদ', 'Police Officer', 'Bangladesh Police', 'University of Dhaka', 'Rangpur', 'Bangladesh'],
        ['Tahmina Begum', 'তাহমিনা বেগম', 'Nurse', 'Rangpur Medical College Hospital', 'Rangpur Nursing College', 'Rangpur', 'Bangladesh'],
        ['Imran Kabir', 'ইমরান কবির', 'Mechanical Engineer', 'Toyota', 'Osaka University', 'Osaka', 'Japan'],
        ['Rumana Parvin', 'রুমানা পারভীন', 'Journalist', 'Prothom Alo', 'University of Dhaka', 'Dhaka', 'Bangladesh'],
        ['Sajid Mahmud', 'সাজিদ মাহমুদ', 'Researcher', 'Max Planck Institute', 'TU Munich', 'Munich', 'Germany'],
        ['Afsana Mimi', 'আফসানা মিমি', 'Pharmacist', 'Square Pharmaceuticals', 'University of Dhaka', 'Dhaka', 'Bangladesh'],
        ['Nazmul Huda', 'নাজমুল হুদা', 'Farmer & Co-op Leader', 'Nautara Krishi Samabay', '', 'Rangpur', 'Bangladesh'],
        ['Jannatul Ferdous', 'জান্নাতুল ফেরদৌস', 'Lawyer', 'Supreme Court of Bangladesh', 'University of Chittagong', 'Dhaka', 'Bangladesh'],
        ['Kamrul Islam', 'কামরুল ইসলাম', 'Product Manager', 'Careem', 'NSU', 'Dubai', 'United Arab Emirates'],
        ['Shirin Akter', 'শিরিন আক্তার', 'Public Health Specialist', 'icddr,b', 'BRAC University', 'Dhaka', 'Bangladesh'],
        ['Mehedi Hasan', 'মেহেদী হাসান', 'Accountant', 'KPMG', 'University of Melbourne', 'Melbourne', 'Australia'],
        ['Lima Khatun', 'লিমা খাতুন', 'Graphic Designer', 'Freelance', 'Begum Rokeya University', 'Rangpur', 'Bangladesh'],
        ['Hasibul Alam', 'হাসিবুল আলম', 'Army Officer', 'Bangladesh Army', 'Bangladesh Military Academy', 'Saidpur', 'Bangladesh'],
    ];

    private const BIOS = [
        'Always happy to help juniors with university admission questions.',
        'Proud of the school field where it all started. Reach out any time.',
        'Working on projects that bring opportunity back home.',
        '',
    ];

    public function handle(): int
    {
        if (! app()->environment('local', 'testing') && ! $this->option('force')) {
            $this->error('Refusing to seed demo data outside the local environment (use --force).');

            return self::FAILURE;
        }
        if (User::where('email', 'like', '%@demo.together.test')->exists()) {
            $this->error('Demo data already exists.');

            return self::FAILURE;
        }
        $password = $this->option('password') ?: Str::password(12, symbols: false);
        mt_srand(42);
        $years = [2008, 2012, 2015, 2018, 2021, 2022];

        DB::transaction(function () use ($password, $years) {
            $batches = collect($years)->mapWithKeys(fn ($y) => [$y => Batch::firstOrCreate(['year' => $y])]);
            $committee = User::create(['email' => 'committee@demo.together.test', 'phone' => '+8801700000001', 'password' => $password]);
            $committee->forceFill(['role' => 'committee', 'is_verified' => true])->save();

            foreach (self::PEOPLE as $i => [$en, $bn, $job, $company, $uni, $city, $country]) {
                $user = User::create([
                    'email' => strtolower(strtok($en, ' ')).$i.'@demo.together.test',
                    'phone' => sprintf('+88017%08d', 10000000 + $i),
                    'password' => $password,
                ]);
                $user->forceFill(['is_verified' => true])->save();
                $status = $i < 16 ? 'approved' : ($i < 20 ? 'pending' : 'rejected');
                $profile = new AlumniProfile([
                    'user_id' => $user->id, 'batch_id' => $batches[$years[$i % count($years)]]->id,
                    'roll' => (string) mt_rand(1, 120), 'section' => ['A', 'B', ''][mt_rand(0, 2)],
                    'full_name_en' => $en, 'full_name_bn' => $bn, 'profession' => $job, 'company' => $company,
                    'university' => $uni, 'city' => $city, 'country' => $country, 'bio' => self::BIOS[mt_rand(0, 3)],
                    'linkedin' => $i % 2 ? "https://www.linkedin.com/in/demo-{$i}" : '',
                ]);
                $profile->forceFill([
                    'status' => $status,
                    'approved_by' => $status === 'approved' ? $committee->id : null,
                    'review_note' => $status === 'rejected' ? 'Please add your roll number.' : '',
                ])->save();
                if ($i === 1) {
                    BatchCoordinator::create(['batch_id' => $batches[$years[1]]->id, 'user_id' => $user->id]);
                }
            }
        });

        $this->info('Demo data created.');
        $this->line('  committee:   committee@demo.together.test');
        $this->line("  coordinator: tanvir1@demo.together.test (batch {$years[1]})");
        $this->line('  alumni:      farhana0@demo.together.test');
        $this->line("  password for all demo accounts: {$password}");

        return self::SUCCESS;
    }
}
