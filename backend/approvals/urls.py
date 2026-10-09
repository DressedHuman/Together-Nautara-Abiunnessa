from django.urls import path

from .views import (
    PendingListView,
    AlumniAdminListView,
    ApproveView,
    RejectView,
    ApprovalLogsView,
    ApprovalStatsView,
)

urlpatterns = [
    path('pending/', PendingListView.as_view(), name='pending-list'),
    path('alumni/', AlumniAdminListView.as_view(), name='admin-alumni'),
    path('stats/', ApprovalStatsView.as_view(), name='approval-stats'),
    path('<uuid:pk>/approve/', ApproveView.as_view(), name='approve'),
    path('<uuid:pk>/reject/', RejectView.as_view(), name='reject'),
    path('logs/', ApprovalLogsView.as_view(), name='approval-logs'),
]
