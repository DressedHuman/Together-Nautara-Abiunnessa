"""Fill a development database with fictional alumni.

    python manage.py seed_demo            # adds demo data (DEBUG only)
    python manage.py seed_demo --password secret123x
"""
import random
import secrets

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User
from alumni.models import AlumniProfile
from batches.models import Batch, BatchCoordinator

PEOPLE = [
    ('Farhana Akter', 'ফারহানা আক্তার', 'Physician', 'Dhaka Medical College Hospital', 'Dhaka Medical College', 'Dhaka', 'Bangladesh'),
    ('Tanvir Hasan', 'তানভীর হাসান', 'Software Engineer', 'Grameenphone', 'BUET', 'Dhaka', 'Bangladesh'),
    ('Nusrat Jahan', 'নুসরাত জাহান', 'Lecturer', 'University of Rajshahi', 'University of Rajshahi', 'Rajshahi', 'Bangladesh'),
    ('Mahmudul Islam', 'মাহমুদুল ইসলাম', 'Civil Engineer', 'LGED', 'RUET', 'Rajshahi', 'Bangladesh'),
    ('Sabrina Rahman', 'সাবরিনা রহমান', 'Data Scientist', 'Shopify', 'University of Toronto', 'Toronto', 'Canada'),
    ('Rakibul Hasan', 'রাকিবুল হাসান', 'Entrepreneur', 'Barind Agro Ltd.', 'University of Rajshahi', 'Naogaon', 'Bangladesh'),
    ('Sharmin Sultana', 'শারমিন সুলতানা', 'Teacher', 'Nautara Abiunnessa B.L. High School', 'Rajshahi College', 'Rangpur', 'Bangladesh'),
    ('Arif Hossain', 'আরিফ হোসেন', 'Banker', 'Sonali Bank', 'Jahangirnagar University', 'Dhaka', 'Bangladesh'),
    ('Mim Chowdhury', 'মীম চৌধুরী', 'Architect', 'Foster + Partners', 'University College London', 'London', 'United Kingdom'),
    ('Shakil Ahmed', 'শাকিল আহমেদ', 'Police Officer', 'Bangladesh Police', 'University of Dhaka', 'Rangpur', 'Bangladesh'),
    ('Tahmina Begum', 'তাহমিনা বেগম', 'Nurse', 'Rangpur Medical College Hospital', 'Rangpur Nursing College', 'Rangpur', 'Bangladesh'),
    ('Imran Kabir', 'ইমরান কবির', 'Mechanical Engineer', 'Toyota', 'Osaka University', 'Osaka', 'Japan'),
    ('Rumana Parvin', 'রুমানা পারভীন', 'Journalist', 'Prothom Alo', 'University of Dhaka', 'Dhaka', 'Bangladesh'),
    ('Sajid Mahmud', 'সাজিদ মাহমুদ', 'Researcher', 'Max Planck Institute', 'TU Munich', 'Munich', 'Germany'),
    ('Afsana Mimi', 'আফসানা মিমি', 'Pharmacist', 'Square Pharmaceuticals', 'University of Dhaka', 'Dhaka', 'Bangladesh'),
    ('Nazmul Huda', 'নাজমুল হুদা', 'Farmer & Co-op Leader', 'Nautara Krishi Samabay', '', 'Rangpur', 'Bangladesh'),
    ('Jannatul Ferdous', 'জান্নাতুল ফেরদৌস', 'Lawyer', 'Supreme Court of Bangladesh', 'University of Chittagong', 'Dhaka', 'Bangladesh'),
    ('Kamrul Islam', 'কামরুল ইসলাম', 'Product Manager', 'Careem', 'NSU', 'Dubai', 'United Arab Emirates'),
    ('Shirin Akter', 'শিরিন আক্তার', 'Public Health Specialist', 'icddr,b', 'BRAC University', 'Dhaka', 'Bangladesh'),
    ('Mehedi Hasan', 'মেহেদী হাসান', 'Accountant', 'KPMG', 'University of Melbourne', 'Melbourne', 'Australia'),
    ('Lima Khatun', 'লিমা খাতুন', 'Graphic Designer', 'Freelance', 'Begum Rokeya University', 'Rangpur', 'Bangladesh'),
    ('Hasibul Alam', 'হাসিবুল আলম', 'Army Officer', 'Bangladesh Army', 'Bangladesh Military Academy', 'Saidpur', 'Bangladesh'),
]
BIOS = [
    'Always happy to help juniors with university admission questions.',
    'Proud of the school field where it all started. Reach out any time.',
    'Working on projects that bring opportunity back home.',
    '',
]


class Command(BaseCommand):
    help = 'Create fictional demo alumni, a committee member and a coordinator.'

    def add_arguments(self, parser):
        parser.add_argument('--password', help='Password for every demo account (default: random, printed).')
        parser.add_argument('--force', action='store_true', help='Allow running when DEBUG is off.')

    @transaction.atomic
    def handle(self, *args, password=None, force=False, **options):
        if not settings.DEBUG and not force:
            raise CommandError('Refusing to seed demo data with DEBUG off (use --force).')
        if User.objects.filter(email__endswith='@demo.together.test').exists():
            raise CommandError('Demo data already exists.')
        password = password or secrets.token_urlsafe(9)
        rng = random.Random(42)
        years = [2008, 2012, 2015, 2018, 2021, 2022]
        batches = {y: Batch.objects.get_or_create(year=y)[0] for y in years}

        committee = User.objects.create_user(
            email='committee@demo.together.test', phone='+8801700000001', password=password,
            username='committee', role='committee', is_verified=True, is_staff=True,
        )

        for i, (en, bn, job, company, uni, city, country) in enumerate(PEOPLE):
            user = User.objects.create_user(
                email=f'{en.split()[0].lower()}{i}@demo.together.test',
                phone=f'+88017{10000000 + i:08d}', password=password,
                username=f'demo{i}', is_verified=True,
            )
            status = 'approved' if i < 16 else ('pending' if i < 20 else 'rejected')
            AlumniProfile.objects.create(
                user=user, batch=batches[years[i % len(years)]],
                roll=str(rng.randint(1, 120)), section=rng.choice(['A', 'B', '']),
                full_name_en=en, full_name_bn=bn, profession=job, company=company,
                university=uni, city=city, country=country, bio=rng.choice(BIOS),
                linkedin=f'https://www.linkedin.com/in/demo-{i}' if i % 2 else '',
                status=status, approved_by=committee if status == 'approved' else None,
                review_note='Please add your roll number.' if status == 'rejected' else '',
            )
            if i == 1:
                coordinator = user
        BatchCoordinator.objects.create(batch=batches[years[1]], user=coordinator)

        self.stdout.write(self.style.SUCCESS('Demo data created.'))
        self.stdout.write(f'  committee:   committee@demo.together.test')
        self.stdout.write(f'  coordinator: {coordinator.email} (batch {years[1]})')
        self.stdout.write(f'  alumni:      farhana0@demo.together.test')
        self.stdout.write(f'  password for all demo accounts: {password}')
