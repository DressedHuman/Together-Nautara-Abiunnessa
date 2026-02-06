from rest_framework.permissions import BasePermission


class IsCommittee(BasePermission):
    """Only allow committee members to access."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == 'committee'
        )


class IsCoordinator(BasePermission):
    """Only allow coordinators to access."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role in ['coordinator', 'committee']
        )


class IsApprovedAlumni(BasePermission):
    """Only allow approved alumni to access."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        try:
            return request.user.alumni_profile.status == 'approved'
        except:
            return False
