import uuid
import os
from django.db import models
from django.conf import settings
from django.core.validators import URLValidator


def profile_photo_path(instance, filename):
    """Generate secure path for profile photos."""
    ext = filename.split('.')[-1]
    filename = f"{instance.id}.{ext}"
    return os.path.join('alumni', 'photos', filename)


class AlumniProfile(models.Model):
    """Alumni profile with all identity and professional information."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='alumni_profile'
    )
    batch = models.ForeignKey(
        'batches.Batch',
        on_delete=models.PROTECT,
        related_name='alumni_profiles'
    )
    
    # Identity fields
    roll = models.CharField(max_length=50, blank=True)
    section = models.CharField(max_length=20, blank=True)
    full_name_bn = models.CharField(max_length=200)
    full_name_en = models.CharField(max_length=200)
    
    # Location
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    
    # Professional info
    profession = models.CharField(max_length=200, blank=True)
    company = models.CharField(max_length=200, blank=True)
    university = models.CharField(max_length=200, blank=True)
    bio = models.TextField(blank=True)
    
    # Social links
    facebook = models.URLField(blank=True, validators=[URLValidator()])
    linkedin = models.URLField(blank=True, validators=[URLValidator()])
    
    # Photo
    photo = models.ImageField(upload_to=profile_photo_path, blank=True, null=True)
    
    # Approval status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_profiles'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'alumni_profiles'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['profession']),
            models.Index(fields=['country']),
            models.Index(fields=['full_name_en']),
        ]
    
    def __str__(self):
        return f"{self.full_name_en} ({self.batch.year})"
