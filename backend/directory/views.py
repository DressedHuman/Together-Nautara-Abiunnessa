from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from django.core.paginator import Paginator

from alumni.models import AlumniProfile
from .serializers import DirectorySerializer, DirectoryDetailSerializer


class DirectoryView(APIView):
    """Public directory with filtering and pagination."""
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Base queryset - only approved profiles
        queryset = AlumniProfile.objects.filter(
            status='approved'
        ).select_related('batch').order_by('full_name_en')
        
        # Search by name
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(full_name_en__icontains=search) |
                Q(full_name_bn__icontains=search)
            )
        
        # Filter by batch year
        batch = request.query_params.get('batch')
        if batch:
            queryset = queryset.filter(batch__year=batch)
        
        # Filter by profession
        profession = request.query_params.get('profession')
        if profession:
            queryset = queryset.filter(profession__icontains=profession)
        
        # Filter by country
        country = request.query_params.get('country')
        if country:
            queryset = queryset.filter(country__icontains=country)
        
        # Filter by city
        city = request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)
        
        # Pagination
        page_size = int(request.query_params.get('page_size', 20))
        page_size = min(page_size, 100)  # Max 100 per page
        page_num = int(request.query_params.get('page', 1))
        
        paginator = Paginator(queryset, page_size)
        page = paginator.get_page(page_num)
        
        serializer = DirectorySerializer(page.object_list, many=True)
        
        return Response({
            'results': serializer.data,
            'total': paginator.count,
            'pages': paginator.num_pages,
            'current_page': page.number,
            'has_next': page.has_next(),
            'has_previous': page.has_previous()
        })


class DirectoryDetailView(APIView):
    """Get single approved alumni profile."""
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        try:
            profile = AlumniProfile.objects.select_related('batch').get(
                pk=pk,
                status='approved'
            )
            serializer = DirectoryDetailSerializer(profile)
            return Response(serializer.data)
        except AlumniProfile.DoesNotExist:
            return Response(
                {'detail': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class DirectoryFiltersView(APIView):
    """Get available filter options."""
    permission_classes = [AllowAny]
    
    def get(self, request):
        approved = AlumniProfile.objects.filter(status='approved')
        
        # Get unique values for filters
        batches = approved.values_list('batch__year', flat=True).distinct().order_by('-batch__year')
        professions = approved.exclude(profession='').values_list('profession', flat=True).distinct()
        countries = approved.exclude(country='').values_list('country', flat=True).distinct()
        cities = approved.exclude(city='').values_list('city', flat=True).distinct()
        
        return Response({
            'batches': list(batches),
            'professions': list(set(professions))[:50],
            'countries': list(set(countries)),
            'cities': list(set(cities))[:50]
        })
