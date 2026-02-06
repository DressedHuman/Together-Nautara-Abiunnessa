from django.urls import path
from .views import PendingListView, ApproveView, RejectView, ApprovalLogsView

urlpatterns = [
    path('pending/', PendingListView.as_view(), name='pending-list'),
    path('<uuid:pk>/approve/', ApproveView.as_view(), name='approve'),
    path('<uuid:pk>/reject/', RejectView.as_view(), name='reject'),
    path('logs/', ApprovalLogsView.as_view(), name='approval-logs'),
]
