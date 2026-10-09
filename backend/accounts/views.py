from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .emails import send_otp_email
from .models import User
from .serializers import (
    RegisterSerializer,
    LoginEmailSerializer,
    LoginPhoneSerializer,
    OTPRequestSerializer,
    OTPVerifySerializer,
    PasswordResetConfirmSerializer,
    PasswordChangeSerializer,
    UserSerializer,
)

GENERIC_OTP_MESSAGE = 'If an account matches, we have emailed it a 6-digit code.'


def get_tokens_for_user(user):
    """Generate JWT tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


def auth_response(user, **extra):
    return Response({**get_tokens_for_user(user), 'user': UserSerializer(user).data, **extra})


def revoke_all_tokens(user):
    """Blacklist every outstanding refresh token (e.g. after a password change)."""
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


class RegisterView(APIView):
    """Create an account and email a verification code."""

    permission_classes = [AllowAny]
    throttle_scope = 'register'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_otp_email(user, user.generate_otp('verify'), 'verify')
        return Response({
            'message': 'Account created. We emailed you a 6-digit code to verify it.',
            'email': user.email,
        }, status=status.HTTP_201_CREATED)


class _LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'login'
    serializer_class = None

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        if not user.is_verified:
            # The password was right, so it's safe to say why sign-in stopped.
            if user.can_resend_otp():
                send_otp_email(user, user.generate_otp('verify'), 'verify')
            return Response({
                'detail': 'Please verify your email first. We sent you a code.',
                'code': 'unverified',
                'email': user.email,
            }, status=status.HTTP_403_FORBIDDEN)
        return auth_response(user)


class LoginEmailView(_LoginView):
    """Login with email and password."""

    serializer_class = LoginEmailSerializer


class LoginPhoneView(_LoginView):
    """Login with phone and password."""

    serializer_class = LoginPhoneSerializer


class OTPRequestView(APIView):
    """Send a verification or password-reset code."""

    permission_classes = [AllowAny]
    throttle_scope = 'otp'
    fixed_purpose = None

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        purpose = self.fixed_purpose or serializer.validated_data['purpose']
        user = User.objects.filter(
            email__iexact=serializer.validated_data['email'].strip(), is_active=True
        ).first()
        wanted = user and not (purpose == 'verify' and user.is_verified)
        if wanted and user.can_resend_otp():
            send_otp_email(user, user.generate_otp(purpose), purpose)
        return Response({'message': GENERIC_OTP_MESSAGE})


class OTPVerifyView(APIView):
    """Verify the emailed code, mark the account verified and sign in."""

    permission_classes = [AllowAny]
    throttle_scope = 'otp'

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        if not user.is_verified:
            user.is_verified = True
            user.save(update_fields=['is_verified'])
        if not user.is_active:
            return Response({'detail': 'Account is disabled.'}, status=status.HTTP_403_FORBIDDEN)
        return auth_response(user, message='Account verified.')


class PasswordResetRequestView(OTPRequestView):
    """Alias of request-otp with purpose=reset."""

    fixed_purpose = 'reset'


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'otp'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        user.set_password(serializer.validated_data['new_password'])
        user.is_verified = True  # the code proved they own the address
        user.save(update_fields=['password', 'is_verified'])
        revoke_all_tokens(user)
        return Response({'message': 'Password updated. You can sign in now.'})


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        revoke_all_tokens(request.user)
        return auth_response(request.user, message='Password changed.')


class RefreshView(TokenRefreshView):
    throttle_scope = 'login'


class LogoutView(APIView):
    """Blacklist the given refresh token."""

    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass
        return Response({'message': 'Signed out.'})


class MeView(APIView):
    """Get current user details."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
