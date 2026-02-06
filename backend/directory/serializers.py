from rest_framework import serializers
from alumni.models import AlumniProfile


class DirectorySerializer(serializers.ModelSerializer):
    """Serializer for public directory listing."""
    batch_year = serializers.IntegerField(source='batch.year', read_only=True)
    batch_name = serializers.CharField(source='batch.display_name', read_only=True)
    
    class Meta:
        model = AlumniProfile
        fields = [
            'id', 'full_name_en', 'full_name_bn',
            'batch_year', 'batch_name',
            'profession', 'company', 'city', 'country',
            'photo'
        ]


class DirectoryDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for individual alumni view."""
    batch_year = serializers.IntegerField(source='batch.year', read_only=True)
    batch_name = serializers.CharField(source='batch.display_name', read_only=True)
    
    class Meta:
        model = AlumniProfile
        fields = [
            'id', 'full_name_en', 'full_name_bn',
            'batch_year', 'batch_name', 'roll', 'section',
            'profession', 'company', 'university',
            'city', 'country', 'bio',
            'facebook', 'linkedin', 'photo'
        ]
