import uuid
from django.db import models
from django.conf import settings


class Batch(models.Model):
    """Represents an alumni batch year."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    year = models.PositiveIntegerField(unique=True)
    display_name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'batches'
        ordering = ['-year']
        indexes = [
            models.Index(fields=['year']),
        ]
    
    def __str__(self):
        return self.display_name or f"Batch {self.year}"
    
    def save(self, *args, **kwargs):
        if not self.display_name:
            self.display_name = f"Batch of {self.year}"
        super().save(*args, **kwargs)


class BatchCoordinator(models.Model):
    """Links a user as coordinator for a specific batch."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(
        Batch, 
        on_delete=models.CASCADE, 
        related_name='coordinators'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='coordinated_batches'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'batch_coordinators'
        unique_together = ['batch', 'user']
    
    def __str__(self):
        return f"{self.user.email} - {self.batch}"
    
    def save(self, *args, **kwargs):
        # Set user role to coordinator if not already
        if self.user.role == 'alumni':
            self.user.role = 'coordinator'
            self.user.save(update_fields=['role'])
        super().save(*args, **kwargs)
