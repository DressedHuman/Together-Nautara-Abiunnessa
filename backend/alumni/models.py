import uuid
import os

from django.db import models
from django.conf import settings

from core.validators import validate_image_extension


def profile_photo_path(instance, filename):
    """Photos are stored under random names (set by process_profile_photo),
    so URLs can't be guessed from profile ids."""
    return os.path.join('alumni', 'photos', os.path.basename(filename))


class AlumniProfile(models.Model):
    """Alumni profile with all identity and professional information."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    # Changing any of these on an approved profile sends it back for review.
    IDENTITY_FIELDS = ('batch', 'roll', 'section', 'full_name_bn', 'full_name_en')

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
    bio = models.TextField(blank=True, max_length=1000)

    # Social links
    facebook = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)

    photo = models.ImageField(
        upload_to=profile_photo_path,
        blank=True,
        null=True,
        validators=[validate_image_extension]
    )

    # Approval workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_profiles'
    )
    review_note = models.TextField(blank=True)
    recommended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recommended_profiles'
    )
    recommended_at = models.DateTimeField(null=True, blank=True)

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
