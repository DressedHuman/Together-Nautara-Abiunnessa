from django.urls import path
from .views import BatchListView, BatchDetailView, BatchAlumniView

urlpatterns = [
    path('', BatchListView.as_view(), name='batch-list'),
    path('<int:year>/', BatchDetailView.as_view(), name='batch-detail'),
    path('<int:year>/alumni/', BatchAlumniView.as_view(), name='batch-alumni'),
]
