"""Admin-only views for managing users (list, update, delete)"""
from django.apps import apps
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .models import User, UserProfile


def _get_profile_image_url(request, user):
    """Get full profile_image URL from UserProfile."""
    try:
        profile = user.profile
        if profile and profile.profile_image:
            url = profile.profile_image.url
            if request and not (url.startswith("http://") or url.startswith("https://")):
                return request.build_absolute_uri(url)
            return url
    except UserProfile.DoesNotExist:
        pass
    return None


class AdminUserListView(APIView):
    """GET /api/admin/users/ - List all users (admin only)"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        users = User.objects.select_related("profile").all().order_by("id")
        data = [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "profile_image": _get_profile_image_url(request, u),
            }
            for u in users
        ]
        return Response(data, status=status.HTTP_200_OK)


class AdminUserDetailView(APIView):
    """PATCH /api/admin/users/{id}/ - Update user. DELETE /api/admin/users/{id}/ - Delete user"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def patch(self, request, pk):
        user = self.get_user(pk)
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        role = request.data.get("role")
        is_active = request.data.get("is_active")

        if role is not None:
            if role not in ("careseeker", "caregiver", "admin"):
                return Response(
                    {"error": "Invalid role. Must be careseeker, caregiver, or admin"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.role = role
        if is_active is not None:
            user.is_active = bool(is_active)

        user.save()
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        user = self.get_user(pk)
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        # Prevent admin from deleting themselves
        if user.id == request.user.id:
            return Response(
                {"error": "Cannot delete your own account"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminDashboardSummaryView(APIView):
    """GET /api/admin/dashboard-summary/ — counts, recent bookings, complaints (if app installed)."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from bookings.models import Booking
        from verifications.models import CaregiverVerification

        recent_qs = Booking.objects.select_related("family", "caregiver").order_by("-created_at")[:5]
        recent_bookings = [
            {
                "id": b.id,
                "care_seeker_name": (b.family.username if b.family_id else None) or "—",
                "caregiver_name": (b.caregiver.username if b.caregiver_id else None) or "—",
                "status": b.status,
            }
            for b in recent_qs
        ]

        open_complaints = 0
        recent_complaints = []
        if apps.is_installed("complaints"):
            from complaints.models import Complaint

            open_complaints = Complaint.objects.filter(
                status__in=("open", "investigating")
            ).count()
            for c in Complaint.objects.select_related("reporter").order_by("-created_at")[:5]:
                desc = (c.description or "").strip()
                first_line = desc.split("\n")[0] if desc else ""
                subject = (first_line[:80] + ("…" if len(first_line) > 80 else "")) or f"Complaint #{c.id}"
                recent_complaints.append(
                    {
                        "id": c.id,
                        "user_name": c.reporter.username if c.reporter_id else "—",
                        "subject": subject,
                        "status": c.status,
                    }
                )

        return Response(
            {
                "total_users": User.objects.count(),
                "total_caregivers": User.objects.filter(role="caregiver").count(),
                "total_bookings": Booking.objects.count(),
                "pending_verifications": CaregiverVerification.objects.filter(
                    verification_status="pending"
                ).count(),
                "open_complaints": open_complaints,
                "recent_bookings": recent_bookings,
                "recent_complaints": recent_complaints,
            },
            status=status.HTTP_200_OK,
        )
