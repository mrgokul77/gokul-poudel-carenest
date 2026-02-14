from rest_framework.permissions import BasePermission


class IsCareSeeker(BasePermission):
    """Only careseekers (families) can access - used for booking creation"""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "careseeker"
        )

    message = "Only care seekers can access this resource."
