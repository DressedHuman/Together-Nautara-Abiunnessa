"""End-to-end API tests: every feature plus the security rules.

    .venv/bin/python manage.py test
"""
import io
import re
import shutil
import tempfile
from datetime import timedelta

from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APITestCase

from accounts.models import User, normalize_phone
from alumni.models import AlumniProfile
from approvals.models import ApprovalLog
from batches.models import Batch, BatchCoordinator

API = '/api/v1'
PASSWORD = 'Str0ng-pass-phrase'
MEDIA = tempfile.mkdtemp()


def make_user(email, role='alumni', verified=True, phone=None):
    make_user.n = getattr(make_user, 'n', 0) + 1
    return User.objects.create_user(
        email=email, phone=phone or f'+88017{make_user.n:08d}', password=PASSWORD,
        username=email.split('@')[0], role=role, is_verified=verified,
    )


def make_profile(user, year=2015, status='pending', **extra):
    batch, _ = Batch.objects.get_or_create(year=year)
    return AlumniProfile.objects.create(
        user=user, batch=batch, full_name_en=extra.pop('full_name_en', 'Test Person'),
        full_name_bn='টেস্ট', status=status, **extra,
    )


def image_file(fmt='JPEG', size=(1200, 900), name='me.jpg', exif=False):
    buf = io.BytesIO()
    img = Image.new('RGB', size, (20, 60, 120))
    kwargs = {}
    if exif:
        ex = Image.Exif()
        ex[0x8825] = {2: (23.0, 45.0, 0.0)}  # GPS block
        kwargs['exif'] = ex
    img.save(buf, format=fmt, **kwargs)
    return SimpleUploadedFile(name, buf.getvalue(), content_type=f'image/{fmt.lower()}')


def code_from_mail(index=-1):
    return re.search(r'\b(\d{6})\b', mail.outbox[index].body).group(1)


LOCAL_STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}


@override_settings(MEDIA_ROOT=MEDIA, STORAGES=LOCAL_STORAGES,
                   PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'],
                   EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class BaseTest(APITestCase):
    def setUp(self):
        cache.clear()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def login(self, user):
        self.client.force_authenticate(user)


class AuthFlowTests(BaseTest):
    def test_register_verify_login(self):
        res = self.client.post(f'{API}/auth/register/', {
            'email': 'New@Example.com', 'phone': '01712 345678',
            'password': PASSWORD, 'password_confirm': PASSWORD,
        })
        self.assertEqual(res.status_code, 201, res.data)
        self.assertNotIn('otp', res.data)                      # code never leaves via the API
        user = User.objects.get(email='new@example.com')
        self.assertEqual(user.phone, '+8801712345678')
        self.assertNotEqual(user.otp_code, code_from_mail())  # stored hashed

        # unverified users can't sign in, but are told why
        res = self.client.post(f'{API}/auth/login-email/', {'email': 'new@example.com', 'password': PASSWORD})
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data['code'], 'unverified')

        res = self.client.post(f'{API}/auth/verify-otp/', {'email': 'new@example.com', 'otp': code_from_mail(0)})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn('access', res.data)
        self.assertTrue(User.objects.get(pk=user.pk).is_verified)

        res = self.client.post(f'{API}/auth/login-email/', {'email': 'NEW@example.com', 'password': PASSWORD})
        self.assertEqual(res.status_code, 200)
        res = self.client.post(f'{API}/auth/login-phone/', {'phone': '+880 1712-345678', 'password': PASSWORD})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['user']['has_profile'])

    def test_register_validation(self):
        make_user('taken@example.com', phone='+8801711111111')
        cases = [
            ({'email': 'taken@EXAMPLE.com', 'phone': '01811111111'}, 'email'),
            ({'email': 'a@example.com', 'phone': '01711111111'}, 'phone'),
            ({'email': 'b@example.com', 'phone': '12345'}, 'phone'),
        ]
        for data, field in cases:
            res = self.client.post(f'{API}/auth/register/', {**data, 'password': PASSWORD, 'password_confirm': PASSWORD})
            self.assertEqual(res.status_code, 400)
            self.assertIn(field, res.data)
        res = self.client.post(f'{API}/auth/register/', {
            'email': 'c@example.com', 'phone': '01911111111', 'password': 'password', 'password_confirm': 'password'})
        self.assertEqual(res.status_code, 400)  # common password rejected

    def test_wrong_credentials_are_generic(self):
        make_user('a@example.com')
        for path, data in [
            ('login-email', {'email': 'a@example.com', 'password': 'nope-nope-1'}),
            ('login-email', {'email': 'ghost@example.com', 'password': 'nope-nope-1'}),
            ('login-phone', {'phone': '01799999999', 'password': 'nope-nope-1'}),
        ]:
            res = self.client.post(f'{API}/auth/{path}/', data)
            self.assertEqual(res.status_code, 400)
            self.assertEqual(str(res.data['detail'][0]), 'Invalid credentials.')

    def test_inactive_user_cannot_login(self):
        u = make_user('off@example.com')
        u.is_active = False
        u.save()
        res = self.client.post(f'{API}/auth/login-email/', {'email': 'off@example.com', 'password': PASSWORD})
        self.assertEqual(res.status_code, 400)

    def test_otp_request_does_not_enumerate(self):
        make_user('real@example.com', verified=False)
        a = self.client.post(f'{API}/auth/request-otp/', {'email': 'real@example.com'})
        b = self.client.post(f'{API}/auth/request-otp/', {'email': 'ghost@example.com'})
        self.assertEqual(a.status_code, b.status_code)
        self.assertEqual(a.data, b.data)
        self.assertEqual(len(mail.outbox), 1)

    def test_otp_resend_cooldown(self):
        make_user('cool@example.com', verified=False)
        self.client.post(f'{API}/auth/request-otp/', {'email': 'cool@example.com'})
        self.client.post(f'{API}/auth/request-otp/', {'email': 'cool@example.com'})
        self.assertEqual(len(mail.outbox), 1)

    def test_otp_brute_force_burns_code(self):
        user = make_user('bf@example.com', verified=False)
        code = user.generate_otp('verify')
        wrong = '000000' if code != '000000' else '111111'
        for _ in range(5):
            self.client.post(f'{API}/auth/verify-otp/', {'email': 'bf@example.com', 'otp': wrong})
        res = self.client.post(f'{API}/auth/verify-otp/', {'email': 'bf@example.com', 'otp': code})
        self.assertEqual(res.status_code, 400)  # right code, but too late

    def test_otp_expires(self):
        user = make_user('exp@example.com', verified=False)
        code = user.generate_otp('verify')
        User.objects.filter(pk=user.pk).update(otp_created_at=timezone.now() - timedelta(minutes=11))
        res = self.client.post(f'{API}/auth/verify-otp/', {'email': 'exp@example.com', 'otp': code})
        self.assertEqual(res.status_code, 400)

    def test_reset_code_cannot_verify_and_vice_versa(self):
        user = make_user('p@example.com', verified=False)
        code = user.generate_otp('reset')
        res = self.client.post(f'{API}/auth/verify-otp/', {'email': 'p@example.com', 'otp': code})
        self.assertEqual(res.status_code, 400)

    def test_password_reset_revokes_sessions(self):
        make_user('r@example.com')
        login = self.client.post(f'{API}/auth/login-email/', {'email': 'r@example.com', 'password': PASSWORD}).data
        self.client.post(f'{API}/auth/password-reset/', {'email': 'r@example.com'})
        res = self.client.post(f'{API}/auth/password-reset/confirm/', {
            'email': 'r@example.com', 'otp': code_from_mail(), 'new_password': 'An0ther-good-one'})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self.client.post(f'{API}/auth/refresh-token/', {'refresh': login['refresh']}).status_code, 401)
        res = self.client.post(f'{API}/auth/login-email/', {'email': 'r@example.com', 'password': 'An0ther-good-one'})
        self.assertEqual(res.status_code, 200)

    def test_change_password(self):
        user = make_user('c@example.com')
        self.login(user)
        res = self.client.post(f'{API}/auth/change-password/', {'current_password': 'wrong', 'new_password': 'An0ther-good-one'})
        self.assertEqual(res.status_code, 400)
        res = self.client.post(f'{API}/auth/change-password/', {'current_password': PASSWORD, 'new_password': 'An0ther-good-one'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)

    def test_refresh_rotation_and_logout(self):
        make_user('t@example.com')
        tokens = self.client.post(f'{API}/auth/login-email/', {'email': 't@example.com', 'password': PASSWORD}).data
        new = self.client.post(f'{API}/auth/refresh-token/', {'refresh': tokens['refresh']})
        self.assertEqual(new.status_code, 200)
        # the old refresh token was blacklisted on rotation
        self.assertEqual(self.client.post(f'{API}/auth/refresh-token/', {'refresh': tokens['refresh']}).status_code, 401)
        self.client.post(f'{API}/auth/logout/', {'refresh': new.data['refresh']})
        self.assertEqual(self.client.post(f'{API}/auth/refresh-token/', {'refresh': new.data['refresh']}).status_code, 401)

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get(f'{API}/auth/me/').status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer not-a-token')
        self.assertEqual(self.client.get(f'{API}/auth/me/').status_code, 401)

    def test_login_is_throttled(self):
        make_user('th@example.com')
        codes = [
            self.client.post(f'{API}/auth/login-email/', {'email': 'th@example.com', 'password': 'bad-bad-bad'}).status_code
            for _ in range(12)
        ]
        self.assertIn(429, codes)

    def test_phone_normalization(self):
        self.assertEqual(normalize_phone('01712-345678'), '+8801712345678')
        self.assertEqual(normalize_phone('8801712345678'), '+8801712345678')
        self.assertEqual(normalize_phone('0044 20 7946 0958'), '+442079460958')
        self.assertIsNone(normalize_phone('hello'))


class ProfileTests(BaseTest):
    def setUp(self):
        super().setUp()
        self.user = make_user('me@example.com')
        self.login(self.user)

    def payload(self, **extra):
        return {'batch_year': 2015, 'full_name_en': 'Rahim Uddin', 'full_name_bn': 'রহিম উদ্দিন', **extra}

    def test_create_and_update_profile(self):
        self.assertEqual(self.client.get(f'{API}/alumni/me/').status_code, 404)
        res = self.client.post(f'{API}/alumni/me/', self.payload(city='Dhaka', linkedin='linkedin.com/in/rahim'), format='multipart')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['status'], 'pending')
        self.assertEqual(res.data['batch_year'], 2015)
        self.assertEqual(res.data['linkedin'], 'https://linkedin.com/in/rahim')
        self.assertTrue(Batch.objects.filter(year=2015).exists())
        # a second profile is refused
        self.assertEqual(self.client.post(f'{API}/alumni/me/', self.payload(), format='multipart').status_code, 400)
        res = self.client.put(f'{API}/alumni/me/', {'profession': 'Teacher'}, format='multipart')
        self.assertEqual(res.data['profession'], 'Teacher')

    def test_cannot_set_status_or_owner(self):
        other = make_user('other@example.com')
        res = self.client.post(f'{API}/alumni/me/', self.payload(status='approved', user=str(other.id)), format='multipart')
        self.assertEqual(res.status_code, 201)
        profile = AlumniProfile.objects.get(pk=res.data['id'])
        self.assertEqual(profile.status, 'pending')
        self.assertEqual(profile.user, self.user)

    def test_validation(self):
        for bad in [{'batch_year': 1800}, {'full_name_en': ' '}, {'facebook': 'https://evil.example/facebook.com'},
                    {'linkedin': 'javascript:alert(1)'}]:
            res = self.client.post(f'{API}/alumni/me/', self.payload(**bad), format='multipart')
            self.assertEqual(res.status_code, 400, bad)

    def test_unverified_user_cannot_create_profile(self):
        self.login(make_user('unv@example.com', verified=False))
        self.assertEqual(self.client.post(f'{API}/alumni/me/', self.payload(), format='multipart').status_code, 403)

    def test_photo_is_reencoded_and_stripped(self):
        res = self.client.post(f'{API}/alumni/me/', self.payload(photo=image_file(exif=True)), format='multipart')
        self.assertEqual(res.status_code, 201, res.data)
        profile = AlumniProfile.objects.get(pk=res.data['id'])
        with Image.open(profile.photo.path) as img:
            self.assertEqual(img.format, 'JPEG')
            self.assertLessEqual(max(img.size), 800)
            self.assertNotIn(0x8825, img.getexif())
        self.assertNotIn(str(profile.id), profile.photo.name)  # unguessable name
        old_path = profile.photo.path
        self.client.put(f'{API}/alumni/me/', {'photo': image_file('PNG', name='x.png')}, format='multipart')
        profile.refresh_from_db()
        self.assertNotEqual(profile.photo.path, old_path)
        import os
        self.assertFalse(os.path.exists(old_path))
        self.client.put(f'{API}/alumni/me/', {'remove_photo': 'true'}, format='multipart')
        profile.refresh_from_db()
        self.assertFalse(profile.photo)

    def test_rejects_fake_images(self):
        fake = SimpleUploadedFile('shell.jpg', b'<?php system($_GET[1]); ?>', content_type='image/jpeg')
        res = self.client.post(f'{API}/alumni/me/', self.payload(photo=fake), format='multipart')
        self.assertEqual(res.status_code, 400)
        gif = image_file('GIF', name='a.gif')
        res = self.client.post(f'{API}/alumni/me/', self.payload(photo=gif), format='multipart')
        self.assertEqual(res.status_code, 400)

    def test_identity_change_requires_re_review(self):
        profile = make_profile(self.user, status='approved', full_name_en='Rahim Uddin')
        self.client.put(f'{API}/alumni/me/', {'city': 'Khulna'}, format='multipart')
        profile.refresh_from_db()
        self.assertEqual(profile.status, 'approved')
        self.client.put(f'{API}/alumni/me/', {'full_name_en': 'Someone Else'}, format='multipart')
        profile.refresh_from_db()
        self.assertEqual(profile.status, 'pending')

    def test_rejected_profile_resubmits(self):
        profile = make_profile(self.user, status='rejected')
        self.client.put(f'{API}/alumni/me/', {'roll': '12'}, format='multipart')
        profile.refresh_from_db()
        self.assertEqual(profile.status, 'pending')


class DirectoryTests(BaseTest):
    def setUp(self):
        super().setUp()
        self.approved = make_profile(make_user('a@example.com'), status='approved', full_name_en='Alpha Approved',
                                     facebook='https://facebook.com/alpha', roll='7', profession='Doctor', country='Japan')
        self.pending = make_profile(make_user('p@example.com'), status='pending', full_name_en='Pending Person')
        make_profile(make_user('r@example.com'), status='rejected', full_name_en='Rejected Person', year=2016)

    def test_only_approved_listed(self):
        res = self.client.get(f'{API}/directory/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([r['full_name_en'] for r in res.data['results']], ['Alpha Approved'])
        self.assertNotIn('email', res.data['results'][0])
        self.assertNotIn('phone', res.data['results'][0])
        self.assertEqual(self.client.get(f'{API}/directory/{self.pending.id}/').status_code, 404)
        self.assertEqual(self.client.get(f'{API}/alumni/{self.pending.id}/').status_code, 404)

    def test_filters_and_bad_params(self):
        self.assertEqual(self.client.get(f'{API}/directory/?search=doctor').data['total'], 1)
        self.assertEqual(self.client.get(f'{API}/directory/?country=japan&batch=2015').data['total'], 1)
        self.assertEqual(self.client.get(f'{API}/directory/?batch=1999').data['total'], 0)
        self.assertEqual(self.client.get(f'{API}/directory/?page=abc').status_code, 400)
        self.assertEqual(self.client.get(f'{API}/directory/?page=999').status_code, 200)
        self.assertEqual(self.client.get(f'{API}/directory/?page_size=100000').status_code, 200)
        filters = self.client.get(f'{API}/directory/filters/').data
        self.assertEqual(filters['batches'], [2015])
        self.assertEqual(filters['countries'], ['Japan'])
        stats = self.client.get(f'{API}/directory/stats/').data
        self.assertEqual(stats['alumni'], 1)

    def test_contact_links_are_members_only(self):
        res = self.client.get(f'{API}/directory/{self.approved.id}/')
        self.assertNotIn('facebook', res.data)
        self.assertNotIn('roll', res.data)
        self.assertTrue(res.data['members_only_hidden'])
        # a pending member still can't see them
        self.login(self.pending.user)
        self.assertNotIn('facebook', self.client.get(f'{API}/directory/{self.approved.id}/').data)
        # an approved member can
        viewer = make_profile(make_user('v@example.com'), status='approved')
        self.login(viewer.user)
        res = self.client.get(f'{API}/directory/{self.approved.id}/')
        self.assertEqual(res.data['facebook'], 'https://facebook.com/alpha')
        self.assertNotIn('email', res.data)

    def test_owner_sees_own_pending_profile(self):
        self.login(self.pending.user)
        res = self.client.get(f'{API}/alumni/{self.pending.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'pending')

    def test_public_batches_count_approved_only(self):
        res = self.client.get(f'{API}/batches/')
        counts = {b['year']: b['alumni_count'] for b in res.data}
        self.assertEqual(counts, {2015: 1, 2016: 0})
        res = self.client.get(f'{API}/batches/2015/alumni/')
        self.assertEqual(res.data['total'], 1)


class CommitteeTests(BaseTest):
    def setUp(self):
        super().setUp()
        self.committee = make_user('boss@example.com', role='committee')
        self.alumnus = make_user('al@example.com')
        self.profile = make_profile(self.alumnus)

    def test_alumni_cannot_use_committee_endpoints(self):
        self.login(self.alumnus)
        for method, path in [
            ('get', 'approvals/pending/'), ('get', 'approvals/alumni/'), ('get', 'approvals/logs/'),
            ('get', 'approvals/stats/'), ('post', f'approvals/{self.profile.id}/approve/'),
            ('post', f'approvals/{self.profile.id}/reject/'), ('post', 'batches/'),
            ('delete', 'batches/2015/'), ('post', 'batches/2015/coordinators/'),
            ('get', 'coordinator/batch-alumni/'), ('post', 'coordinator/verify-alumni/'),
        ]:
            res = getattr(self.client, method)(f'{API}/{path}', {})
            self.assertEqual(res.status_code, 403, path)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f'{API}/approvals/pending/').status_code, 401)

    def test_approve_reject_flow(self):
        self.login(self.committee)
        res = self.client.get(f'{API}/approvals/pending/')
        self.assertEqual(res.data['total'], 1)
        self.assertEqual(res.data['results'][0]['email'], 'al@example.com')

        res = self.client.post(f'{API}/approvals/{self.profile.id}/reject/', {'note': 'Add roll'})
        self.assertEqual(res.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual((self.profile.status, self.profile.review_note), ('rejected', 'Add roll'))
        self.assertIn('Add roll', mail.outbox[-1].body)

        res = self.client.post(f'{API}/approvals/{self.profile.id}/approve/', {})
        self.assertEqual(res.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, 'approved')
        self.assertEqual(self.profile.approved_by, self.committee)
        # can't approve twice
        self.assertEqual(self.client.post(f'{API}/approvals/{self.profile.id}/approve/', {}).status_code, 400)
        # revoke
        self.assertEqual(self.client.post(f'{API}/approvals/{self.profile.id}/reject/', {}).status_code, 200)
        self.assertEqual(ApprovalLog.objects.filter(alumni=self.profile).count(), 3)
        logs = self.client.get(f'{API}/approvals/logs/').data
        self.assertEqual(logs[0]['actor'], 'boss@example.com')
        self.assertEqual(self.client.get(f'{API}/approvals/stats/').data['rejected'], 1)
        self.assertEqual(self.client.get(f'{API}/approvals/alumni/?status=rejected&search=al@').data['total'], 1)
        # committee sees full record by id
        self.assertEqual(self.client.get(f'{API}/alumni/{self.profile.id}/').data['email'], 'al@example.com')

    def test_batch_management(self):
        self.login(self.committee)
        res = self.client.post(f'{API}/batches/', {'year': 2030})
        self.assertEqual(res.status_code, 400)  # out of range
        res = self.client.post(f'{API}/batches/', {'year': 2010, 'display_name': 'SSC 2010'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(self.client.post(f'{API}/batches/', {'year': 2010}).status_code, 400)
        res = self.client.patch(f'{API}/batches/2010/', {'display_name': 'Class of 2010'})
        self.assertEqual(res.data['display_name'], 'Class of 2010')
        # a batch with profiles can't be deleted
        self.assertEqual(self.client.delete(f'{API}/batches/2015/').status_code, 400)

        res = self.client.post(f'{API}/batches/2015/coordinators/', {'email': 'AL@example.com'})
        self.assertEqual(res.status_code, 201, res.data)
        self.alumnus.refresh_from_db()
        self.assertEqual(self.alumnus.role, 'coordinator')
        self.assertEqual(self.client.post(f'{API}/batches/2015/coordinators/', {'email': 'al@example.com'}).status_code, 400)
        self.assertEqual(self.client.post(f'{API}/batches/2015/coordinators/', {'email': 'ghost@example.com'}).status_code, 400)
        link = BatchCoordinator.objects.get()
        res = self.client.delete(f'{API}/batches/2015/coordinators/{link.id}/')
        self.assertEqual(res.status_code, 200)
        self.alumnus.refresh_from_db()
        self.assertEqual(self.alumnus.role, 'alumni')

        detail = self.client.get(f'{API}/batches/?detail=1').data
        self.assertIn('pending_count', detail[0])
        self.assertEqual(self.client.delete(f'{API}/batches/2010/').status_code, 204)


class CoordinatorTests(BaseTest):
    def setUp(self):
        super().setUp()
        self.coord = make_user('co@example.com')
        BatchCoordinator.objects.create(batch=Batch.objects.create(year=2015), user=self.coord)
        self.coord.refresh_from_db()
        self.mine = make_profile(make_user('mate@example.com'), year=2015)
        self.other = make_profile(make_user('far@example.com'), year=2018)

    def test_sees_only_own_batches(self):
        self.login(self.coord)
        res = self.client.get(f'{API}/coordinator/batch-alumni/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([r['id'] for r in res.data['results']], [str(self.mine.id)])
        self.assertEqual(res.data['batches'], [2015])

    def test_recommend(self):
        self.login(self.coord)
        res = self.client.post(f'{API}/coordinator/verify-alumni/', {'alumni_id': str(self.other.id)})
        self.assertEqual(res.status_code, 404)  # not their batch
        res = self.client.post(f'{API}/coordinator/verify-alumni/', {'alumni_id': str(self.mine.id), 'note': 'Classmate'})
        self.assertEqual(res.status_code, 200)
        self.mine.refresh_from_db()
        self.assertEqual(self.mine.recommended_by, self.coord)
        self.assertEqual(self.mine.status, 'pending')  # committee still decides
        own = make_profile(self.coord, year=2015)
        res = self.client.post(f'{API}/coordinator/verify-alumni/', {'alumni_id': str(own.id)})
        self.assertEqual(res.status_code, 400)


class SecurityHeaderTests(BaseTest):
    def test_api_root_and_headers(self):
        res = self.client.get(f'{API}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(res['X-Frame-Options'], 'DENY')

    def test_browsable_api_disabled(self):
        res = self.client.get(f'{API}/directory/', HTTP_ACCEPT='text/html')
        self.assertNotEqual(res.get('Content-Type', '').split(';')[0], 'text/html')
