import uuid
from django.db import models
from django.conf import settings


class ApprovalLog(models.Model):
    """Tracks approval/rejection actions for alumni profiles."""
    
    STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alumni = models.ForeignKey(
        'alumni.AlumniProfile',
        on_delete=models.CASCADE,
        related_name='approval_logs'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='approval_actions'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'approval_logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.alumni.full_name_en} - {self.status} by {self.approved_by}"
