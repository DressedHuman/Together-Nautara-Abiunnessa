from rest_framework.permissions import BasePermission


class IsCommittee(BasePermission):
    """Only allow committee members to access."""
    message = 'Committee access required.'
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == 'committee'
        )


class IsCoordinator(BasePermission):
    """Allow coordinators and committee members to access."""
    message = 'Coordinator or committee access required.'
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role in ['coordinator', 'committee']
        )


class IsAlumniOwner(BasePermission):
    """Only allow alumni to access their own profile."""
    message = 'You can only access your own profile.'
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Check if the object has a user attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        # Check if the object IS the user
        if hasattr(obj, 'email'):
            return obj == request.user
        return False


class IsApprovedAlumni(BasePermission):
    """Only allow approved alumni to access."""
    message = 'Your profile must be approved to access this resource.'
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        try:
            return request.user.alumni_profile.status == 'approved'
        except:
            return False


class IsVerifiedUser(BasePermission):
    """Only allow verified users to access."""
    message = 'Your account must be verified.'
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.is_verified
        )


class IsOwnerOrCommittee(BasePermission):
    """Allow owner or committee members to access."""
    message = 'You must be the owner or a committee member.'
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Committee can access anything
        if request.user.role == 'committee':
            return True
        
        # Check ownership
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'email'):
            return obj == request.user
        return False


class IsBatchCoordinator(BasePermission):
    """Allow batch coordinators for their batch or committee."""
    message = 'You must be a coordinator for this batch.'
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role in ['coordinator', 'committee']
        )
    
    def has_object_permission(self, request, view, obj):
        # Committee can access all
        if request.user.role == 'committee':
            return True
        
        # Get batch from object
        batch = None
        if hasattr(obj, 'batch'):
            batch = obj.batch
        elif hasattr(obj, 'year'):  # Object is a Batch
            batch = obj
        
        if not batch:
            return False
        
        # Check if user is coordinator for this batch
        return batch.coordinators.filter(user=request.user).exists()
