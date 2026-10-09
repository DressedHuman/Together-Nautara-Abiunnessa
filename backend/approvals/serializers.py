from rest_framework import serializers

from .models import ApprovalLog


class ApprovalLogSerializer(serializers.ModelSerializer):
    """Serializer for approval log entries."""

    actor = serializers.EmailField(source='approved_by.email', read_only=True, default=None)
    alumni_name = serializers.CharField(source='alumni.full_name_en', read_only=True)
    batch_year = serializers.IntegerField(source='alumni.batch.year', read_only=True)

    class Meta:
        model = ApprovalLog
        fields = ['id', 'alumni', 'alumni_name', 'batch_year', 'actor', 'status', 'note', 'created_at']
        read_only_fields = fields


class ApprovalActionSerializer(serializers.Serializer):
    """Serializer for approve/reject action."""

    note = serializers.CharField(required=False, allow_blank=True, max_length=1000)
