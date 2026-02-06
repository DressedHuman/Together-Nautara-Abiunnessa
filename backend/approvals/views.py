from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import ApprovalLog
from .serializers import ApprovalLogSerializer, ApprovalActionSerializer, PendingAlumniSerializer
from alumni.models import AlumniProfile
from core.permissions import IsCommittee


class PendingListView(APIView):
    """List pending alumni profiles for approval."""
    permission_classes = [IsCommittee]
    
    def get(self, request):
        queryset = AlumniProfile.objects.filter(
            status='pending'
        ).select_related('batch', 'user').order_by('created_at')
        
        # Filter by batch year if provided
        batch_year = request.query_params.get('batch')
        if batch_year:
            queryset = queryset.filter(batch__year=batch_year)
        
        # Filter by name if provided
        name = request.query_params.get('name')
        if name:
            queryset = queryset.filter(full_name_en__icontains=name)
        
        serializer = PendingAlumniSerializer(queryset, many=True)
        return Response({
            'pending': serializer.data,
            'total': queryset.count()
        })


class ApproveView(APIView):
    """Approve an alumni profile."""
    permission_classes = [IsCommittee]
    
    def post(self, request, pk):
        profile = get_object_or_404(AlumniProfile, pk=pk)
        
        if profile.status != 'pending':
            return Response(
                {'detail': 'Profile is not pending'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update profile status
        profile.status = 'approved'
        profile.approved_by = request.user
        profile.save(update_fields=['status', 'approved_by', 'updated_at'])
        
        # Mark user as verified
        profile.user.is_verified = True
        profile.user.save(update_fields=['is_verified'])
        
        # Create approval log
        ApprovalLog.objects.create(
            alumni=profile,
            approved_by=request.user,
            status='approved',
            note=serializer.validated_data.get('note', '')
        )
        
        return Response({'message': 'Alumni approved successfully'})


class RejectView(APIView):
    """Reject an alumni profile."""
    permission_classes = [IsCommittee]
    
    def post(self, request, pk):
        profile = get_object_or_404(AlumniProfile, pk=pk)
        
        if profile.status != 'pending':
            return Response(
                {'detail': 'Profile is not pending'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update profile status
        profile.status = 'rejected'
        profile.save(update_fields=['status', 'updated_at'])
        
        # Create approval log
        ApprovalLog.objects.create(
            alumni=profile,
            approved_by=request.user,
            status='rejected',
            note=serializer.validated_data.get('note', '')
        )
        
        return Response({'message': 'Alumni rejected'})


class ApprovalLogsView(APIView):
    """List approval action logs."""
    permission_classes = [IsCommittee]
    
    def get(self, request):
        queryset = ApprovalLog.objects.select_related(
            'alumni', 'approved_by'
        ).order_by('-created_at')
        
        # Filter by status
        log_status = request.query_params.get('status')
        if log_status:
            queryset = queryset.filter(status=log_status)
        
        # Limit results
        limit = int(request.query_params.get('limit', 50))
        queryset = queryset[:limit]
        
        serializer = ApprovalLogSerializer(queryset, many=True)
        return Response(serializer.data)
