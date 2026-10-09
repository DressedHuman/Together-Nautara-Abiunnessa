from datetime import date

from rest_framework import serializers

from accounts.serializers import PublicUserSerializer
from .models import Batch, BatchCoordinator


class BatchCoordinatorSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = BatchCoordinator
        fields = ['id', 'user', 'name', 'created_at']

    def get_name(self, obj):
        profile = getattr(obj.user, 'alumni_profile', None)
        return profile.full_name_en if profile else None


class BatchListSerializer(serializers.ModelSerializer):
    """Optimized serializer for batch listing."""

    alumni_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Batch
        fields = ['id', 'year', 'display_name', 'alumni_count']


class BatchDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with coordinators (committee view)."""

    coordinators = BatchCoordinatorSerializer(many=True, read_only=True)
    alumni_count = serializers.IntegerField(read_only=True, default=0)
    pending_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Batch
        fields = ['id', 'year', 'display_name', 'coordinators', 'alumni_count', 'pending_count', 'created_at']


class BatchWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Batch
        fields = ['year', 'display_name']
        extra_kwargs = {'display_name': {'required': False, 'allow_blank': True}}

    def validate_year(self, value):
        latest = date.today().year + 1
        if not 1950 <= value <= latest:
            raise serializers.ValidationError(f'Year must be between 1950 and {latest}.')
        return value

    def validate_display_name(self, value):
        return (value or '').strip()[:100]
