from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginEmailView,
    LoginPhoneView,
    OTPRequestView,
    OTPVerifyView,
    LogoutView,
    MeView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login-email/', LoginEmailView.as_view(), name='login-email'),
    path('login-phone/', LoginPhoneView.as_view(), name='login-phone'),
    path('verify-otp/', OTPVerifyView.as_view(), name='verify-otp'),
    path('request-otp/', OTPRequestView.as_view(), name='request-otp'),
    path('refresh-token/', TokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
]
