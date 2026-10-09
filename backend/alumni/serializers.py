from datetime import date
from urllib.parse import urlparse

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from batches.models import Batch
from core.validators import process_profile_photo
from .models import AlumniProfile

FIRST_BATCH_YEAR = 1950

SOCIAL_DOMAINS = {
    'facebook': ('facebook.com', 'fb.com', 'fb.me'),
    'linkedin': ('linkedin.com',),
}


def photo_url(profile, context):
    """Absolute URL for a stored photo, or None."""
    if not profile.photo:
        return None
    url = profile.photo.url
    request = context.get('request') if context else None
    if request is not None and url.startswith('/'):
        return request.build_absolute_uri(url)
    return url


def clean_social(value, network):
    if not value:
        return ''
    value = value.strip()
    if not value.lower().startswith(('http://', 'https://')):
        value = 'https://' + value
    parsed = urlparse(value)
    host = (parsed.hostname or '').lower()
    allowed = SOCIAL_DOMAINS[network]
    if parsed.scheme not in ('http', 'https') or not any(host == d or host.endswith('.' + d) for d in allowed):
        raise serializers.ValidationError(f'Enter a link to a {network.title()} profile.')
    return parsed._replace(scheme='https').geturl()


class AlumniProfileSerializer(serializers.ModelSerializer):
    """An alumnus's own profile (also used by the committee)."""

    batch_year = serializers.IntegerField(source='batch.year', read_only=True)
    batch_name = serializers.CharField(source='batch.display_name', read_only=True)
    photo = serializers.SerializerMethodField()
    recommended = serializers.SerializerMethodField()

    class Meta:
        model = AlumniProfile
        fields = [
            'id', 'batch_year', 'batch_name', 'roll', 'section',
            'full_name_bn', 'full_name_en', 'city', 'country',
            'profession', 'company', 'university', 'bio',
            'facebook', 'linkedin', 'photo', 'status', 'review_note',
            'recommended', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_photo(self, obj):
        return photo_url(obj, self.context)

    def get_recommended(self, obj):
        return obj.recommended_by_id is not None


class AlumniProfileWriteSerializer(serializers.ModelSerializer):
    """Create or update the signed-in user's profile."""

    batch_year = serializers.IntegerField(write_only=True)
    photo = serializers.ImageField(write_only=True, required=False, allow_null=True)
    remove_photo = serializers.BooleanField(write_only=True, required=False, default=False)
    # Plain text in, normalized https URL out (see clean_social)
    facebook = serializers.CharField(required=False, allow_blank=True, max_length=200)
    linkedin = serializers.CharField(required=False, allow_blank=True, max_length=200)

    class Meta:
        model = AlumniProfile
        fields = [
            'batch_year', 'roll', 'section', 'full_name_bn', 'full_name_en',
            'city', 'country', 'profession', 'company', 'university',
            'bio', 'facebook', 'linkedin', 'photo', 'remove_photo',
        ]

    def validate_batch_year(self, value):
        latest = date.today().year + 1
        if not FIRST_BATCH_YEAR <= value <= latest:
            raise serializers.ValidationError(f'Enter an SSC year between {FIRST_BATCH_YEAR} and {latest}.')
        return value

    def _name(self, value, label):
        value = (value or '').strip()
        if len(value) < 2:
            raise serializers.ValidationError(f'{label} is required.')
        return value

    def validate_full_name_bn(self, value):
        return self._name(value, 'Name in Bangla')

    def validate_full_name_en(self, value):
        return self._name(value, 'Name in English')

    def validate_facebook(self, value):
        return clean_social(value, 'facebook')

    def validate_linkedin(self, value):
        return clean_social(value, 'linkedin')

    def validate_photo(self, value):
        if value is None:
            return None
        try:
            return process_profile_photo(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)

    def validate(self, attrs):
        for key, value in list(attrs.items()):
            if isinstance(value, str) and key not in ('facebook', 'linkedin'):
                attrs[key] = value.strip()
        if 'batch_year' in attrs:
            year = attrs.pop('batch_year')
            attrs['batch'], _ = Batch.objects.get_or_create(year=year)
        return attrs

    def _apply_photo(self, instance, photo, remove):
        if (photo or remove) and instance.photo:
            instance.photo.delete(save=False)
            instance.photo = None
        if photo:
            instance.photo.save(photo.name, photo, save=False)

    def create(self, validated_data):
        photo = validated_data.pop('photo', None)
        validated_data.pop('remove_photo', None)
        profile = AlumniProfile(user=self.context['request'].user, **validated_data)
        self._apply_photo(profile, photo, False)
        profile.save()
        return profile

    def update(self, instance, validated_data):
        photo = validated_data.pop('photo', None)
        remove = validated_data.pop('remove_photo', False)

        identity_changed = any(
            field in validated_data and getattr(instance, field) != validated_data[field]
            for field in AlumniProfile.IDENTITY_FIELDS
        )
        if instance.status == 'rejected' or (instance.status == 'approved' and identity_changed):
            instance.status = 'pending'
            instance.approved_by = None
            instance.recommended_by = None
            instance.recommended_at = None

        for key, value in validated_data.items():
            setattr(instance, key, value)
        self._apply_photo(instance, photo, remove)
        instance.save()
        return instance


class AlumniListSerializer(serializers.ModelSerializer):
    """Compact card used in lists."""

    batch_year = serializers.IntegerField(source='batch.year', read_only=True)
    photo = serializers.SerializerMethodField()

    class Meta:
        model = AlumniProfile
        fields = ['id', 'full_name_en', 'full_name_bn', 'batch_year', 'profession', 'company', 'city', 'country', 'photo']

    def get_photo(self, obj):
        return photo_url(obj, self.context)


class AlumniReviewSerializer(AlumniListSerializer):
    """What coordinators and the committee see when reviewing a profile."""

    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    recommended_by = serializers.EmailField(source='recommended_by.email', read_only=True, default=None)
    approved_by = serializers.EmailField(source='approved_by.email', read_only=True, default=None)

    class Meta(AlumniListSerializer.Meta):
        fields = AlumniListSerializer.Meta.fields + [
            'roll', 'section', 'university', 'bio', 'facebook', 'linkedin',
            'email', 'phone', 'status', 'review_note',
            'recommended_by', 'recommended_at', 'approved_by', 'created_at', 'updated_at',
        ]
