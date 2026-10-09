from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.emails import send_status_email
from alumni.models import AlumniProfile
from alumni.serializers import AlumniReviewSerializer
from core.permissions import IsCommittee
from core.utils import int_param, paginate, text_param
from .models import ApprovalLog
from .serializers import ApprovalLogSerializer, ApprovalActionSerializer


def review_queryset():
    return AlumniProfile.objects.select_related('batch', 'user', 'recommended_by', 'approved_by')


def filter_profiles(request, queryset):
    batch = int_param(request, 'batch')
    if batch:
        queryset = queryset.filter(batch__year=batch)
    search = text_param(request, 'search') or text_param(request, 'name')
    if search:
        queryset = queryset.filter(
            Q(full_name_en__icontains=search) | Q(full_name_bn__icontains=search) |
            Q(user__email__icontains=search) | Q(user__phone__icontains=search) | Q(roll__icontains=search)
        )
    return queryset


class PendingListView(APIView):
    """Pending profiles, oldest first; coordinator-recommended ones on top."""

    permission_classes = [IsCommittee]

    def get(self, request):
        queryset = filter_profiles(request, review_queryset().filter(status='pending'))
        queryset = queryset.order_by('recommended_at', 'created_at')
        if request.query_params.get('recommended') == '1':
            queryset = queryset.exclude(recommended_by=None)
        return Response(paginate(request, queryset, AlumniReviewSerializer))


class AlumniAdminListView(APIView):
    """Every profile, filterable by status, batch and search."""

    permission_classes = [IsCommittee]

    def get(self, request):
        queryset = filter_profiles(request, review_queryset())
        status_filter = text_param(request, 'status', 20)
        if status_filter in ('pending', 'approved', 'rejected'):
            queryset = queryset.filter(status=status_filter)
        return Response(paginate(request, queryset.order_by('-updated_at'), AlumniReviewSerializer))


class _DecisionView(APIView):
    permission_classes = [IsCommittee]
    new_status = None
    allowed_from = ()
    message = ''

    def post(self, request, pk):
        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.validated_data.get('note', '').strip()
        with transaction.atomic():
            profile = get_object_or_404(AlumniProfile.objects.select_for_update(), pk=pk)
            if profile.status not in self.allowed_from:
                return Response(
                    {'detail': f'A {profile.status} profile cannot be {self.new_status}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.status = self.new_status
            profile.approved_by = request.user if self.new_status == 'approved' else None
            profile.review_note = note
            profile.save(update_fields=['status', 'approved_by', 'review_note', 'updated_at'])
            ApprovalLog.objects.create(alumni=profile, approved_by=request.user, status=self.new_status, note=note)
        send_status_email(profile, approved=self.new_status == 'approved', note=note)
        return Response({
            'message': self.message,
            'profile': AlumniReviewSerializer(profile, context={'request': request}).data,
        })


class ApproveView(_DecisionView):
    """Approve a pending (or previously rejected) profile."""

    new_status = 'approved'
    allowed_from = ('pending', 'rejected')
    message = 'Alumni approved.'


class RejectView(_DecisionView):
    """Reject a pending profile, or revoke an approved one."""

    new_status = 'rejected'
    allowed_from = ('pending', 'approved')
    message = 'Alumni rejected.'


class ApprovalLogsView(APIView):
    """Audit trail of approvals, rejections and recommendations."""

    permission_classes = [IsCommittee]

    def get(self, request):
        queryset = ApprovalLog.objects.select_related('alumni__batch', 'approved_by').order_by('-created_at')
        log_status = text_param(request, 'status', 20)
        if log_status:
            queryset = queryset.filter(status=log_status)
        alumni = text_param(request, 'alumni', 40)
        if alumni:
            queryset = queryset.filter(alumni_id=alumni) if len(alumni) >= 32 else queryset.none()
        limit = int_param(request, 'limit', 50, 1, 200)
        return Response(ApprovalLogSerializer(queryset[:limit], many=True).data)


class ApprovalStatsView(APIView):
    permission_classes = [IsCommittee]

    def get(self, request):
        counts = {s: 0 for s in ('pending', 'approved', 'rejected')}
        for row in AlumniProfile.objects.values('status').annotate(n=Count('id')):
            counts[row['status']] = row['n']
        counts['recommended'] = AlumniProfile.objects.filter(status='pending').exclude(recommended_by=None).count()
        return Response(counts)
