from rest_framework import serializers

from alumni.models import AlumniProfile
from alumni.serializers import AlumniListSerializer, photo_url


class DirectorySerializer(AlumniListSerializer):
    """Card in the public directory."""

    batch_name = serializers.CharField(source='batch.display_name', read_only=True)

    class Meta(AlumniListSerializer.Meta):
        fields = AlumniListSerializer.Meta.fields + ['batch_name']


class DirectoryDetailSerializer(serializers.ModelSerializer):
    """Public profile page. Contact links, roll and section are only shown
    to signed-in approved alumni and the committee (`members_only` flag)."""

    batch_year = serializers.IntegerField(source='batch.year', read_only=True)
    batch_name = serializers.CharField(source='batch.display_name', read_only=True)
    photo = serializers.SerializerMethodField()

    MEMBER_FIELDS = ('roll', 'section', 'facebook', 'linkedin')

    class Meta:
        model = AlumniProfile
        fields = [
            'id', 'full_name_en', 'full_name_bn',
            'batch_year', 'batch_name', 'roll', 'section',
            'profession', 'company', 'university',
            'city', 'country', 'bio',
            'facebook', 'linkedin', 'photo',
        ]

    def get_photo(self, obj):
        return photo_url(obj, self.context)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get('is_member'):
            for field in self.MEMBER_FIELDS:
                data.pop(field, None)
        data['members_only_hidden'] = not self.context.get('is_member')
        return data
