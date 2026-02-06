from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from .models import AlumniProfile
from .serializers import (
    AlumniProfileSerializer,
    AlumniProfileCreateSerializer,
    AlumniProfileUpdateSerializer,
)
from core.permissions import IsVerifiedUser


class MyProfileView(APIView):
    """Get or create current user's alumni profile."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        try:
            profile = request.user.alumni_profile
            serializer = AlumniProfileSerializer(profile)
            return Response(serializer.data)
        except AlumniProfile.DoesNotExist:
            return Response(
                {'detail': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def post(self, request):
        # Check if profile already exists
        if hasattr(request.user, 'alumni_profile'):
            return Response(
                {'detail': 'Profile already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = AlumniProfileCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        
        return Response(
            AlumniProfileSerializer(profile).data,
            status=status.HTTP_201_CREATED
        )
    
    def put(self, request):
        try:
            profile = request.user.alumni_profile
        except AlumniProfile.DoesNotExist:
            return Response(
                {'detail': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = AlumniProfileUpdateSerializer(
            profile,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(AlumniProfileSerializer(profile).data)


class AlumniDetailView(APIView):
    """Get alumni profile by ID (public for approved profiles)."""
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        try:
            profile = AlumniProfile.objects.select_related('batch', 'user').get(pk=pk)
            
            # Only show approved profiles to public
            if profile.status != 'approved' and (
                not request.user.is_authenticated or 
                request.user != profile.user
            ):
                return Response(
                    {'detail': 'Profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = AlumniProfileSerializer(profile)
            return Response(serializer.data)
        except AlumniProfile.DoesNotExist:
            return Response(
                {'detail': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
