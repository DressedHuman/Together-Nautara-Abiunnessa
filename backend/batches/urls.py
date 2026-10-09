from django.urls import path

from .views import (
    BatchListView,
    BatchDetailView,
    BatchAlumniView,
    BatchCoordinatorsView,
    BatchCoordinatorDetailView,
    CoordinatorBatchAlumniView,
    CoordinatorVerifyView,
)

urlpatterns = [
    path('', BatchListView.as_view(), name='batch-list'),
    path('<int:year>/', BatchDetailView.as_view(), name='batch-detail'),
    path('<int:year>/alumni/', BatchAlumniView.as_view(), name='batch-alumni'),
    path('<int:year>/coordinators/', BatchCoordinatorsView.as_view(), name='batch-coordinators'),
    path('<int:year>/coordinators/<uuid:pk>/', BatchCoordinatorDetailView.as_view(), name='batch-coordinator-detail'),
]

coordinator_urlpatterns = [
    path('batch-alumni/', CoordinatorBatchAlumniView.as_view(), name='coordinator-batch-alumni'),
    path('verify-alumni/', CoordinatorVerifyView.as_view(), name='coordinator-verify-alumni'),
]
