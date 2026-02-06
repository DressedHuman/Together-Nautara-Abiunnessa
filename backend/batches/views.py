from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Count
from django.shortcuts import get_object_or_404

from .models import Batch
from .serializers import BatchListSerializer, BatchDetailSerializer


class BatchListView(APIView):
    """List all batches with alumni count - optimized query."""
    permission_classes = [AllowAny]
    
    def get(self, request):
        batches = Batch.objects.annotate(
            alumni_count=Count('alumni_profiles')
        ).order_by('-year')
        
        serializer = BatchListSerializer(batches, many=True)
        return Response(serializer.data)


class BatchDetailView(APIView):
    """Get batch details by year."""
    permission_classes = [AllowAny]
    
    def get(self, request, year):
        batch = get_object_or_404(
            Batch.objects.annotate(alumni_count=Count('alumni_profiles')),
            year=year
        )
        serializer = BatchDetailSerializer(batch)
        return Response(serializer.data)


class BatchAlumniView(APIView):
    """Get alumni list for a specific batch."""
    permission_classes = [AllowAny]
    
    def get(self, request, year):
        batch = get_object_or_404(Batch, year=year)
        
        # Will be implemented after AlumniProfile model
        # For now, return empty list structure
        return Response({
            'batch': BatchListSerializer(batch).data,
            'alumni': [],
            'total': 0
        })
