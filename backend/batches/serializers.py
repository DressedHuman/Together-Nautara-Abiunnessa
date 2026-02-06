from rest_framework import serializers
from .models import Batch, BatchCoordinator
from accounts.serializers import UserSerializer


class BatchCoordinatorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = BatchCoordinator
        fields = ['id', 'user', 'created_at']


class BatchListSerializer(serializers.ModelSerializer):
    """Optimized serializer for batch listing."""
    alumni_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Batch
        fields = ['id', 'year', 'display_name', 'alumni_count']


class BatchDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with coordinators."""
    coordinators = BatchCoordinatorSerializer(many=True, read_only=True)
    alumni_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Batch
        fields = ['id', 'year', 'display_name', 'coordinators', 'alumni_count', 'created_at']
