from django.urls import path
from .views import DirectoryView, DirectoryDetailView, DirectoryFiltersView

urlpatterns = [
    path('', DirectoryView.as_view(), name='directory'),
    path('filters/', DirectoryFiltersView.as_view(), name='directory-filters'),
    path('<uuid:pk>/', DirectoryDetailView.as_view(), name='directory-detail'),
]
