import uuid
import random
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import timedelta


class UserManager(BaseUserManager):
    """Custom manager for User model with email as primary identifier."""
    
    def create_user(self, email, phone, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        if not phone:
            raise ValueError('Phone is required')
        
        email = self.normalize_email(email)
        user = self.model(email=email, phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, phone, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)
        extra_fields.setdefault('role', 'committee')
        
        return self.create_user(email, phone, password, **extra_fields)


class User(AbstractUser):
    """Custom User model with email and phone authentication."""
    
    ROLE_CHOICES = [
        ('alumni', 'Alumni'),
        ('coordinator', 'Coordinator'),
        ('committee', 'Committee'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='alumni')
    is_verified = models.BooleanField(default=False)
    
    # OTP fields
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['phone', 'username']
    
    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
        ]
    
    def __str__(self):
        return self.email
    
    def generate_otp(self):
        """Generate a 6-digit OTP and set expiry."""
        self.otp_code = str(random.randint(100000, 999999))
        self.otp_created_at = timezone.now()
        self.save(update_fields=['otp_code', 'otp_created_at'])
        return self.otp_code
    
    def verify_otp(self, code):
        """Verify OTP code. Returns True if valid."""
        if not self.otp_code or not self.otp_created_at:
            return False
        
        # OTP expires after 5 minutes
        expiry_time = self.otp_created_at + timedelta(minutes=5)
        if timezone.now() > expiry_time:
            return False
        
        if self.otp_code == code:
            self.otp_code = None
            self.otp_created_at = None
            self.save(update_fields=['otp_code', 'otp_created_at'])
            return True
        
        return False
