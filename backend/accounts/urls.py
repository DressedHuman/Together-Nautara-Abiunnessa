from django.urls import path

from .views import (
    RegisterView,
    LoginEmailView,
    LoginPhoneView,
    OTPRequestView,
    OTPVerifyView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    PasswordChangeView,
    RefreshView,
    LogoutView,
    MeView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login-email/', LoginEmailView.as_view(), name='login-email'),
    path('login-phone/', LoginPhoneView.as_view(), name='login-phone'),
    path('verify-otp/', OTPVerifyView.as_view(), name='verify-otp'),
    path('request-otp/', OTPRequestView.as_view(), name='request-otp'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('change-password/', PasswordChangeView.as_view(), name='change-password'),
    path('refresh-token/', RefreshView.as_view(), name='token-refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
]
