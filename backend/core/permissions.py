from rest_framework.permissions import BasePermission


def is_committee(user):
    return bool(user and user.is_authenticated and user.role == 'committee')


def is_approved_alumni(user):
    if not (user and user.is_authenticated):
        return False
    profile = getattr(user, 'alumni_profile', None)
    return profile is not None and profile.status == 'approved'


class IsCommittee(BasePermission):
    """Only allow committee members to access."""

    message = 'Committee access required.'

    def has_permission(self, request, view):
        return is_committee(request.user)


class IsCoordinator(BasePermission):
    """Allow coordinators and committee members to access."""

    message = 'Coordinator or committee access required.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in ['coordinator', 'committee']
        )


class IsApprovedAlumni(BasePermission):
    """Only allow approved alumni to access."""

    message = 'Your profile must be approved to access this resource.'

    def has_permission(self, request, view):
        return is_approved_alumni(request.user)


class IsVerifiedUser(BasePermission):
    """Only allow users who confirmed their email."""

    message = 'Your account must be verified.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_verified
