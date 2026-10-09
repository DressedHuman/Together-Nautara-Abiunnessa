from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User, normalize_phone


def clean_phone(value):
    phone = normalize_phone(value)
    if not phone:
        raise serializers.ValidationError(
            'Enter a valid phone number, e.g. 01712345678 or +8801712345678.'
        )
    return phone


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'phone', 'password', 'password_confirm']
        extra_kwargs = {'email': {'validators': []}, 'phone': {'validators': []}}

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate_phone(self, value):
        phone = clean_phone(value)
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError('An account with this phone number already exists.')
        return phone

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        validate_password(attrs['password'], User(email=attrs['email'], phone=attrs['phone']))
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        base = validated_data['email'].split('@')[0][:120] or 'alumni'
        username, counter = base, 1
        while User.objects.filter(username=username).exists():
            username = f'{base}{counter}'
            counter += 1
        return User.objects.create_user(username=username, **validated_data)


class LoginEmailSerializer(serializers.Serializer):
    """Serializer for email login."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs['email'].strip(), password=attrs['password'])
        if not user:
            raise serializers.ValidationError({'detail': 'Invalid credentials.'})
        attrs['user'] = user
        return attrs


class LoginPhoneSerializer(serializers.Serializer):
    """Serializer for phone login."""

    phone = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        phone = normalize_phone(attrs['phone'])
        user = User.objects.filter(phone=phone).first() if phone else None
        if user is None:
            User().set_password(attrs['password'])  # same work as a real check: no timing oracle
            raise serializers.ValidationError({'detail': 'Invalid credentials.'})
        user = authenticate(username=user.email, password=attrs['password'])
        if not user:
            raise serializers.ValidationError({'detail': 'Invalid credentials.'})
        attrs['user'] = user
        return attrs


class OTPRequestSerializer(serializers.Serializer):
    """Ask for a fresh code. Never reveals whether the account exists."""

    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=['verify', 'reset'], default='verify')


class OTPVerifySerializer(serializers.Serializer):
    """Serializer for OTP verification."""

    email = serializers.EmailField()
    otp = serializers.RegexField(r'^\d{6}$', error_messages={'invalid': 'Enter the 6-digit code.'})

    def validate(self, attrs):
        user = User.objects.filter(email__iexact=attrs['email'].strip()).first()
        if not user or not user.verify_otp(attrs['otp'], purpose='verify'):
            raise serializers.ValidationError({'detail': 'Invalid or expired code.'})
        attrs['user'] = user
        return attrs


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.RegexField(r'^\d{6}$', error_messages={'invalid': 'Enter the 6-digit code.'})
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate(self, attrs):
        user = User.objects.filter(email__iexact=attrs['email'].strip()).first()
        if not user or not user.verify_otp(attrs['otp'], purpose='reset'):
            raise serializers.ValidationError({'detail': 'Invalid or expired code.'})
        validate_password(attrs['new_password'], user)
        attrs['user'] = user
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError({'current_password': 'Current password is incorrect.'})
        validate_password(attrs['new_password'], user)
        return attrs


class UserSerializer(serializers.ModelSerializer):
    """The signed-in user's own account details."""

    has_profile = serializers.SerializerMethodField()
    profile_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'role', 'is_verified', 'has_profile', 'profile_status', 'created_at']
        read_only_fields = fields

    def _profile(self, obj):
        return getattr(obj, 'alumni_profile', None)

    def get_has_profile(self, obj):
        return self._profile(obj) is not None

    def get_profile_status(self, obj):
        profile = self._profile(obj)
        return profile.status if profile else None


class PublicUserSerializer(serializers.ModelSerializer):
    """Minimal user info for committee screens."""

    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'role']
        read_only_fields = fields
