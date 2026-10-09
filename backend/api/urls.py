"""
API v1 URL Configuration.

All v1 endpoints are registered here for modular routing.
Future versions (v2, v3) can be created similarly.
"""
from django.urls import path, include

from batches.urls import coordinator_urlpatterns
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny


class APIRootView(APIView):
    """API Root - lists available endpoints."""
    permission_classes = [AllowAny]
    
    def get(self, request):
        base_url = request.build_absolute_uri('/api/v1/')
        return Response({
            'version': 'v1',
            'endpoints': {
                'auth': f"{base_url}auth/",
                'batches': f"{base_url}batches/",
                'alumni': f"{base_url}alumni/",
                'approvals': f"{base_url}approvals/",
                'directory': f"{base_url}directory/",
                'coordinator': f"{base_url}coordinator/",
            }
        })


# v1 URL patterns
v1_patterns = [
    path('', APIRootView.as_view(), name='api-root'),
    path('auth/', include('accounts.urls')),
    path('batches/', include('batches.urls')),
    path('alumni/', include('alumni.urls')),
    path('approvals/', include('approvals.urls')),
    path('directory/', include('directory.urls')),
    path('coordinator/', include(coordinator_urlpatterns)),
]

urlpatterns = [
    path('v1/', include((v1_patterns, 'v1'))),
]
