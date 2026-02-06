from rest_framework import serializers
from .models import ApprovalLog
from alumni.serializers import AlumniListSerializer
from accounts.serializers import UserSerializer


class ApprovalLogSerializer(serializers.ModelSerializer):
    """Serializer for approval log entries."""
    approved_by = UserSerializer(read_only=True)
    alumni_name = serializers.CharField(source='alumni.full_name_en', read_only=True)
    
    class Meta:
        model = ApprovalLog
        fields = ['id', 'alumni', 'alumni_name', 'approved_by', 'status', 'note', 'created_at']
        read_only_fields = ['id', 'approved_by', 'created_at']


class ApprovalActionSerializer(serializers.Serializer):
    """Serializer for approve/reject action."""
    note = serializers.CharField(required=False, allow_blank=True)


class PendingAlumniSerializer(serializers.ModelSerializer):
    """Serializer for pending alumni list."""
    from alumni.models import AlumniProfile
    
    batch_year = serializers.IntegerField(source='batch.year', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    
    class Meta:
        from alumni.models import AlumniProfile
        model = AlumniProfile
        fields = [
            'id', 'full_name_en', 'full_name_bn', 'batch_year',
            'user_email', 'user_phone', 'roll', 'section',
            'photo', 'created_at'
        ]
