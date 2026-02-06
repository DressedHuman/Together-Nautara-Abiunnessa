"""URL configuration for config project."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/batches/', include('batches.urls')),
    path('api/v1/alumni/', include('alumni.urls')),
    path('api/v1/approvals/', include('approvals.urls')),
    path('api/v1/directory/', include('directory.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
