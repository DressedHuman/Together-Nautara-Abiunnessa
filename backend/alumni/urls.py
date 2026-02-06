from django.urls import path
from .views import MyProfileView, AlumniDetailView

urlpatterns = [
    path('me/', MyProfileView.as_view(), name='my-profile'),
    path('<uuid:pk>/', AlumniDetailView.as_view(), name='alumni-detail'),
]
