from django.urls import path

from .views import DirectoryView, DirectoryDetailView, DirectoryFiltersView, StatsView

urlpatterns = [
    path('', DirectoryView.as_view(), name='directory'),
    path('filters/', DirectoryFiltersView.as_view(), name='directory-filters'),
    path('stats/', StatsView.as_view(), name='directory-stats'),
    path('<uuid:pk>/', DirectoryDetailView.as_view(), name='directory-detail'),
]
