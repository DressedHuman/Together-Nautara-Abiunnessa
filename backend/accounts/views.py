from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import User
from .serializers import (
    RegisterSerializer,
    LoginEmailSerializer,
    LoginPhoneSerializer,
    OTPRequestSerializer,
    OTPVerifySerializer,
    UserSerializer,
)


def get_tokens_for_user(user):
    """Generate JWT tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    """User registration endpoint."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate OTP for verification
        otp = user.generate_otp()
        
        # In production, send OTP via email/SMS here
        # For now, return it in response (remove in production)
        
        return Response({
            'message': 'Registration successful. Please verify your account.',
            'user': UserSerializer(user).data,
            'otp': otp,  # Remove in production
        }, status=status.HTTP_201_CREATED)


class LoginEmailView(APIView):
    """Login with email and password."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': UserSerializer(user).data,
        })


class LoginPhoneView(APIView):
    """Login with phone and password."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginPhoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': UserSerializer(user).data,
        })


class OTPRequestView(APIView):
    """Request OTP for verification."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        otp = user.generate_otp()
        
        # In production, send OTP via email/SMS here
        
        return Response({
            'message': 'OTP sent successfully',
            'otp': otp,  # Remove in production
        })


class OTPVerifyView(APIView):
    """Verify OTP and mark user as verified."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        user.is_verified = True
        user.save(update_fields=['is_verified'])
        
        tokens = get_tokens_for_user(user)
        
        return Response({
            'message': 'Account verified successfully',
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': UserSerializer(user).data,
        })


class LogoutView(APIView):
    """Logout and blacklist refresh token."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logout successful'})
        except Exception:
            return Response({'message': 'Logout successful'})


class MeView(APIView):
    """Get current user details."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response(UserSerializer(request.user).data)
