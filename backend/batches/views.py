from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from alumni.models import AlumniProfile
from alumni.serializers import AlumniListSerializer, AlumniReviewSerializer
from approvals.models import ApprovalLog
from core.permissions import IsCommittee, IsCoordinator, is_committee
from core.utils import paginate, text_param
from .models import Batch, BatchCoordinator
from .serializers import BatchListSerializer, BatchDetailSerializer, BatchWriteSerializer

APPROVED_COUNT = Count('alumni_profiles', filter=Q(alumni_profiles__status='approved'))
PENDING_COUNT = Count('alumni_profiles', filter=Q(alumni_profiles__status='pending'))


def batch_detail(year):
    return get_object_or_404(
        Batch.objects.annotate(alumni_count=APPROVED_COUNT, pending_count=PENDING_COUNT)
        .prefetch_related('coordinators__user__alumni_profile'),
        year=year,
    )


class BatchListView(APIView):
    """Public: every batch with its approved-member count.
    Committee: POST creates a batch."""

    def get_permissions(self):
        return [IsCommittee()] if self.request.method == 'POST' else [AllowAny()]

    def get(self, request):
        if is_committee(request.user) and request.query_params.get('detail'):
            batches = (
                Batch.objects.annotate(alumni_count=APPROVED_COUNT, pending_count=PENDING_COUNT)
                .prefetch_related('coordinators__user__alumni_profile').order_by('-year')
            )
            return Response(BatchDetailSerializer(batches, many=True).data)
        batches = Batch.objects.annotate(alumni_count=APPROVED_COUNT).order_by('-year')
        return Response(BatchListSerializer(batches, many=True).data)

    def post(self, request):
        serializer = BatchWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        batch = serializer.save()
        return Response(BatchDetailSerializer(batch_detail(batch.year)).data, status=status.HTTP_201_CREATED)


class BatchDetailView(APIView):
    """Public: batch details. Committee: PATCH renames, DELETE removes an empty batch."""

    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsCommittee()]

    def get(self, request, year):
        batch = batch_detail(year)
        if is_committee(request.user):
            return Response(BatchDetailSerializer(batch).data)
        return Response(BatchListSerializer(batch).data)

    def patch(self, request, year):
        batch = get_object_or_404(Batch, year=year)
        serializer = BatchWriteSerializer(batch, data={'display_name': request.data.get('display_name', '')}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(BatchDetailSerializer(batch_detail(year)).data)

    def delete(self, request, year):
        batch = get_object_or_404(Batch, year=year)
        if batch.alumni_profiles.exists():
            return Response(
                {'detail': 'This batch still has alumni profiles and cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            users = [c.user for c in batch.coordinators.select_related('user')]
            batch.delete()
            for user in users:
                demote_if_no_batches(user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class BatchAlumniView(APIView):
    """Approved alumni of one batch."""

    permission_classes = [AllowAny]

    def get(self, request, year):
        batch = get_object_or_404(Batch.objects.annotate(alumni_count=APPROVED_COUNT), year=year)
        alumni = AlumniProfile.objects.filter(batch=batch, status='approved').select_related('batch').order_by('full_name_en')
        return Response({
            'batch': BatchListSerializer(batch).data,
            'alumni': AlumniListSerializer(alumni, many=True, context={'request': request}).data,
            'total': alumni.count(),
        })


def demote_if_no_batches(user):
    if user.role == 'coordinator' and not user.coordinated_batches.exists():
        user.role = 'alumni'
        user.save(update_fields=['role'])


class BatchCoordinatorsView(APIView):
    """Committee: assign a coordinator to a batch by email."""

    permission_classes = [IsCommittee]

    def post(self, request, year):
        batch = get_object_or_404(Batch, year=year)
        email = str(request.data.get('email', '')).strip()
        user = User.objects.filter(email__iexact=email, is_active=True).first() if email else None
        if user is None:
            return Response({'email': ['No active account uses this email.']}, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_verified:
            return Response({'email': ['That account has not verified its email yet.']}, status=status.HTTP_400_BAD_REQUEST)
        _, created = BatchCoordinator.objects.get_or_create(batch=batch, user=user)
        if not created:
            return Response({'email': ['Already a coordinator of this batch.']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BatchDetailSerializer(batch_detail(year)).data, status=status.HTTP_201_CREATED)


class BatchCoordinatorDetailView(APIView):
    """Committee: remove a coordinator."""

    permission_classes = [IsCommittee]

    def delete(self, request, year, pk):
        link = get_object_or_404(BatchCoordinator.objects.select_related('user'), batch__year=year, pk=pk)
        user = link.user
        with transaction.atomic():
            link.delete()
            demote_if_no_batches(user)
        return Response(BatchDetailSerializer(batch_detail(year)).data)


# ---- Coordinator endpoints -------------------------------------------------

def coordinator_batches(user):
    if is_committee(user):
        return Batch.objects.all()
    return Batch.objects.filter(coordinators__user=user)


class CoordinatorBatchAlumniView(APIView):
    """Every profile (any status) in the batches the user coordinates."""

    permission_classes = [IsCoordinator]

    def get(self, request):
        batches = coordinator_batches(request.user)
        queryset = (
            AlumniProfile.objects.filter(batch__in=batches)
            .select_related('batch', 'user', 'recommended_by', 'approved_by')
            .order_by('status', 'full_name_en')
        )
        status_filter = text_param(request, 'status', 20)
        if status_filter in ('pending', 'approved', 'rejected'):
            queryset = queryset.filter(status=status_filter)
        search = text_param(request, 'search')
        if search:
            queryset = queryset.filter(Q(full_name_en__icontains=search) | Q(full_name_bn__icontains=search) | Q(roll__icontains=search))
        payload = paginate(request, queryset, AlumniReviewSerializer)
        payload['batches'] = sorted(batches.values_list('year', flat=True), reverse=True) if not is_committee(request.user) else []
        return Response(payload)


class RecommendSerializer(serializers.Serializer):
    alumni_id = serializers.UUIDField()
    note = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class CoordinatorVerifyView(APIView):
    """A coordinator vouches for a pending batchmate; the committee still decides."""

    permission_classes = [IsCoordinator]

    def post(self, request):
        serializer = RecommendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = AlumniProfile.objects.filter(
            pk=serializer.validated_data['alumni_id'],
            batch__in=coordinator_batches(request.user),
        ).first()
        if profile is None:
            return Response({'detail': 'Profile not found in your batches.'}, status=status.HTTP_404_NOT_FOUND)
        if profile.status != 'pending':
            return Response({'detail': 'Only pending profiles can be recommended.'}, status=status.HTTP_400_BAD_REQUEST)
        if profile.user_id == request.user.id:
            return Response({'detail': 'You cannot recommend your own profile.'}, status=status.HTTP_400_BAD_REQUEST)
        profile.recommended_by = request.user
        profile.recommended_at = timezone.now()
        profile.save(update_fields=['recommended_by', 'recommended_at', 'updated_at'])
        ApprovalLog.objects.create(
            alumni=profile, approved_by=request.user, status='recommended',
            note=serializer.validated_data.get('note', ''),
        )
        return Response({'message': 'Recommended to the committee.'})
