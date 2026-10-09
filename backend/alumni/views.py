from rest_framework import status
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsVerifiedUser, is_committee
from directory.views import public_profile_response
from .models import AlumniProfile
from .serializers import AlumniProfileSerializer, AlumniProfileWriteSerializer, AlumniReviewSerializer


class MyProfileView(APIView):
    """Get, create or update the signed-in user's alumni profile."""

    permission_classes = [IsVerifiedUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _profile(self, request):
        return AlumniProfile.objects.select_related('batch').filter(user=request.user).first()

    def get(self, request):
        profile = self._profile(request)
        if profile is None:
            return Response({'detail': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AlumniProfileSerializer(profile, context={'request': request}).data)

    def post(self, request):
        if self._profile(request) is not None:
            return Response({'detail': 'Profile already exists'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = AlumniProfileWriteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(
            AlumniProfileSerializer(profile, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def put(self, request):
        profile = self._profile(request)
        if profile is None:
            return Response({'detail': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AlumniProfileWriteSerializer(
            profile, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AlumniProfileSerializer(profile, context={'request': request}).data)

    patch = put


class AlumniDetailView(APIView):
    """A profile by id: the full record for its owner and the committee,
    otherwise the same view as the public directory (approved only)."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        profile = AlumniProfile.objects.select_related('batch', 'user', 'recommended_by', 'approved_by').filter(pk=pk).first()
        if profile and is_committee(request.user):
            return Response(AlumniReviewSerializer(profile, context={'request': request}).data)
        if profile and request.user.is_authenticated and profile.user_id == request.user.id:
            return Response(AlumniProfileSerializer(profile, context={'request': request}).data)
        return public_profile_response(request, pk)
