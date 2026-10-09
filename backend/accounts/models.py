import re
import uuid
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


def normalize_phone(raw):
    """Normalize a phone number to +<digits>. Bangladeshi local numbers
    (01XXXXXXXXX) become +8801XXXXXXXXX. Returns None if it isn't a phone."""
    if raw is None:
        return None
    phone = re.sub(r'[\s\-().]', '', str(raw))
    if re.fullmatch(r'01\d{9}', phone):
        return '+88' + phone
    if re.fullmatch(r'8801\d{9}', phone):
        return '+' + phone
    if phone.startswith('00'):
        phone = '+' + phone[2:]
    if re.fullmatch(r'\+\d{8,15}', phone):
        return phone
    return None


class UserManager(BaseUserManager):
    """Custom manager for User model with email as primary identifier."""

    def get_by_natural_key(self, username):
        return self.get(email__iexact=username)

    def create_user(self, email, phone, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        if not phone:
            raise ValueError('Phone is required')
        email = self.normalize_email(email).lower()
        user = self.model(email=email, phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, phone, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)
        extra_fields.setdefault('role', 'committee')
        extra_fields.setdefault('username', email.split('@')[0])
        return self.create_user(email, phone, password, **extra_fields)


class User(AbstractUser):
    """Custom User model with email and phone authentication."""

    ROLE_CHOICES = [
        ('alumni', 'Alumni'),
        ('coordinator', 'Coordinator'),
        ('committee', 'Committee'),
    ]
    OTP_PURPOSES = [
        ('verify', 'Verify account'),
        ('reset', 'Reset password'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='alumni')
    is_verified = models.BooleanField(default=False)

    # One-time code: only a hash is stored
    otp_code = models.CharField(max_length=128, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    otp_purpose = models.CharField(max_length=10, choices=OTP_PURPOSES, blank=True)
    otp_attempts = models.PositiveSmallIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['phone']

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
        ]

    def __str__(self):
        return self.email

    def can_resend_otp(self):
        if not self.otp_created_at:
            return True
        return timezone.now() >= self.otp_created_at + timedelta(seconds=settings.OTP_RESEND_SECONDS)

    def generate_otp(self, purpose='verify'):
        """Create a fresh 6-digit code, store its hash and return the code."""
        code = f'{secrets.randbelow(1_000_000):06d}'
        self.otp_code = make_password(code)
        self.otp_created_at = timezone.now()
        self.otp_purpose = purpose
        self.otp_attempts = 0
        self.save(update_fields=['otp_code', 'otp_created_at', 'otp_purpose', 'otp_attempts'])
        return code

    def clear_otp(self):
        self.otp_code = None
        self.otp_created_at = None
        self.otp_purpose = ''
        self.otp_attempts = 0
        self.save(update_fields=['otp_code', 'otp_created_at', 'otp_purpose', 'otp_attempts'])

    def verify_otp(self, code, purpose='verify'):
        """Check a code. Each wrong guess counts; the code is burned after
        OTP_MAX_ATTEMPTS failures or once it is used."""
        if not self.otp_code or not self.otp_created_at or self.otp_purpose != purpose:
            return False
        expired = timezone.now() > self.otp_created_at + timedelta(minutes=settings.OTP_TTL_MINUTES)
        if expired or self.otp_attempts >= settings.OTP_MAX_ATTEMPTS:
            self.clear_otp()
            return False
        if check_password(str(code), self.otp_code):
            self.clear_otp()
            return True
        self.otp_attempts += 1
        self.save(update_fields=['otp_attempts'])
        return False
