from rest_framework.permissions import BasePermission


class IsCaregiver(BasePermission):
    """Only caregivers can access - used for document upload and booking responses"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'caregiver'

    message = "Only caregivers can access this resource."
