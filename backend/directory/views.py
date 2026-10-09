from django.db.models import Count, Q
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from alumni.models import AlumniProfile
from core.permissions import is_approved_alumni, is_committee
from core.utils import int_param, paginate, text_param
from .serializers import DirectorySerializer, DirectoryDetailSerializer


def public_profile_response(request, pk):
    profile = AlumniProfile.objects.select_related('batch').filter(pk=pk, status='approved').first()
    if profile is None:
        return Response({'detail': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
    is_member = is_approved_alumni(request.user) or is_committee(request.user)
    serializer = DirectoryDetailSerializer(profile, context={'request': request, 'is_member': is_member})
    return Response(serializer.data)


class DirectoryView(APIView):
    """Public directory of approved alumni with filtering and pagination."""

    permission_classes = [AllowAny]

    def get(self, request):
        queryset = AlumniProfile.objects.filter(status='approved').select_related('batch')

        search = text_param(request, 'search')
        if search:
            queryset = queryset.filter(
                Q(full_name_en__icontains=search) |
                Q(full_name_bn__icontains=search) |
                Q(profession__icontains=search) |
                Q(company__icontains=search) |
                Q(university__icontains=search)
            )
        batch = int_param(request, 'batch')
        if batch:
            queryset = queryset.filter(batch__year=batch)
        for field in ('profession', 'country', 'city'):
            value = text_param(request, field)
            if value:
                queryset = queryset.filter(**{f'{field}__icontains': value})

        ordering = {
            'name': ('full_name_en',),
            'batch': ('batch__year', 'full_name_en'),
            '-batch': ('-batch__year', 'full_name_en'),
            'recent': ('-updated_at',),
        }.get(request.query_params.get('ordering'), ('full_name_en',))
        queryset = queryset.order_by(*ordering)

        return Response(paginate(request, queryset, DirectorySerializer, default_size=12))


class DirectoryDetailView(APIView):
    """Get single approved alumni profile."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        return public_profile_response(request, pk)


class DirectoryFiltersView(APIView):
    """Distinct values for the directory filter dropdowns."""

    permission_classes = [AllowAny]

    def get(self, request):
        approved = AlumniProfile.objects.filter(status='approved')

        def distinct(field, limit=None):
            values = (
                approved.exclude(**{field: ''})
                .values(field).annotate(n=Count('id')).order_by('-n', field)
            )
            if limit:
                values = values[:limit]
            return sorted({row[field].strip() for row in values}, key=str.lower)

        batches = approved.values_list('batch__year', flat=True).distinct().order_by('-batch__year')
        return Response({
            'batches': list(batches),
            'professions': distinct('profession', 50),
            'countries': distinct('country'),
            'cities': distinct('city', 50),
        })


class StatsView(APIView):
    """Headline numbers for the home page (approved profiles only)."""

    permission_classes = [AllowAny]

    def get(self, request):
        approved = AlumniProfile.objects.filter(status='approved')
        return Response({
            'alumni': approved.count(),
            'batches': approved.values('batch').distinct().count(),
            'countries': approved.exclude(country='').values('country').distinct().count(),
            'professions': approved.exclude(profession='').values('profession').distinct().count(),
        })
