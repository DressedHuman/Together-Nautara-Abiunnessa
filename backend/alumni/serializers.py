from rest_framework import serializers
from .models import AlumniProfile
from batches.serializers import BatchListSerializer


class AlumniProfileSerializer(serializers.ModelSerializer):
    """Full serializer for alumni profile."""
    batch = BatchListSerializer(read_only=True)
    batch_id = serializers.UUIDField(write_only=True, required=False)
    
    class Meta:
        model = AlumniProfile
        fields = [
            'id', 'batch', 'batch_id', 'roll', 'section',
            'full_name_bn', 'full_name_en', 'city', 'country',
            'profession', 'company', 'university', 'bio',
            'facebook', 'linkedin', 'photo', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at']
    
    def validate_full_name_bn(self, value):
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError('Full name (Bengali) is required')
        return value.strip()
    
    def validate_full_name_en(self, value):
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError('Full name (English) is required')
        return value.strip()


class AlumniProfileCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating alumni profile."""
    batch_year = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = AlumniProfile
        fields = [
            'batch_year', 'roll', 'section',
            'full_name_bn', 'full_name_en', 'city', 'country',
            'profession', 'company', 'university', 'bio',
            'facebook', 'linkedin', 'photo'
        ]
    
    def validate_full_name_bn(self, value):
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError('Full name (Bengali) is required')
        return value.strip()
    
    def validate_full_name_en(self, value):
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError('Full name (English) is required')
        return value.strip()
    
    def validate_batch_year(self, value):
        from batches.models import Batch
        try:
            Batch.objects.get(year=value)
        except Batch.DoesNotExist:
            raise serializers.ValidationError('Invalid batch year')
        return value
    
    def create(self, validated_data):
        from batches.models import Batch
        batch_year = validated_data.pop('batch_year')
        batch = Batch.objects.get(year=batch_year)
        validated_data['batch'] = batch
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class AlumniProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating alumni profile."""
    
    class Meta:
        model = AlumniProfile
        fields = [
            'roll', 'section', 'full_name_bn', 'full_name_en',
            'city', 'country', 'profession', 'company', 'university',
            'bio', 'facebook', 'linkedin', 'photo'
        ]
    
    def validate_full_name_bn(self, value):
        if value and len(value.strip()) < 2:
            raise serializers.ValidationError('Full name (Bengali) must be at least 2 characters')
        return value.strip() if value else value
    
    def validate_full_name_en(self, value):
        if value and len(value.strip()) < 2:
            raise serializers.ValidationError('Full name (English) must be at least 2 characters')
        return value.strip() if value else value


class AlumniListSerializer(serializers.ModelSerializer):
    """Optimized serializer for alumni listing."""
    batch_year = serializers.IntegerField(source='batch.year', read_only=True)
    
    class Meta:
        model = AlumniProfile
        fields = [
            'id', 'full_name_en', 'batch_year', 'profession',
            'city', 'country', 'photo', 'status'
        ]
