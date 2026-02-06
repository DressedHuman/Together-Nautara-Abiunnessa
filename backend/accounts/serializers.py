from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'phone', 'username', 'password', 'password_confirm']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match'})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class LoginEmailSerializer(serializers.Serializer):
    """Serializer for email login."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        user = authenticate(username=email, password=password)
        
        if not user:
            raise serializers.ValidationError({'detail': 'Invalid credentials'})
        
        if not user.is_active:
            raise serializers.ValidationError({'detail': 'Account is disabled'})
        
        attrs['user'] = user
        return attrs


class LoginPhoneSerializer(serializers.Serializer):
    """Serializer for phone login."""
    phone = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        phone = attrs.get('phone')
        password = attrs.get('password')
        
        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            raise serializers.ValidationError({'detail': 'Invalid credentials'})
        
        if not user.check_password(password):
            raise serializers.ValidationError({'detail': 'Invalid credentials'})
        
        if not user.is_active:
            raise serializers.ValidationError({'detail': 'Account is disabled'})
        
        attrs['user'] = user
        return attrs


class OTPRequestSerializer(serializers.Serializer):
    """Serializer for OTP request."""
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False)
    
    def validate(self, attrs):
        email = attrs.get('email')
        phone = attrs.get('phone')
        
        if not email and not phone:
            raise serializers.ValidationError({'detail': 'Email or phone is required'})
        
        try:
            if email:
                user = User.objects.get(email=email)
            else:
                user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            raise serializers.ValidationError({'detail': 'User not found'})
        
        attrs['user'] = user
        return attrs


class OTPVerifySerializer(serializers.Serializer):
    """Serializer for OTP verification."""
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False)
    otp = serializers.CharField(max_length=6)
    
    def validate(self, attrs):
        email = attrs.get('email')
        phone = attrs.get('phone')
        otp = attrs.get('otp')
        
        if not email and not phone:
            raise serializers.ValidationError({'detail': 'Email or phone is required'})
        
        try:
            if email:
                user = User.objects.get(email=email)
            else:
                user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            raise serializers.ValidationError({'detail': 'User not found'})
        
        if not user.verify_otp(otp):
            raise serializers.ValidationError({'detail': 'Invalid or expired OTP'})
        
        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'username', 'role', 'is_verified', 'created_at']
        read_only_fields = ['id', 'role', 'is_verified', 'created_at']


class TokenSerializer(serializers.Serializer):
    """Serializer for JWT tokens response."""
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()
