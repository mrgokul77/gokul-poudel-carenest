# admin-only endpoints for managing users
from django.apps import apps
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404

from bookings.models import Booking
from verifications.models import CaregiverVerification
try:
    from complaints.models import Complaint
except ImportError:
    Complaint = None

from .models import User, UserProfile


def _get_profile_image_url(request, user):
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
        if user.id == request.user.id:
            return Response(
                {"error": "Cannot delete your own account"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminDashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        recent_qs = Booking.objects.select_related("family", "caregiver").order_by(
            "-date",
            "-start_time",
            "-created_at",
        )[:5]
        recent_bookings = [
            {
                "id": b.id,
                "care_seeker_name": (b.family.username if b.family_id else None) or "—",
                "caregiver_name": (b.caregiver.username if b.caregiver_id else None) or "—",
                "date": b.date,
                "start_time": b.start_time,
                "duration_hours": b.duration_hours,
                "status": b.status,
            }
            for b in recent_qs
        ]

        open_complaints = 0
        recent_complaints = []

        if Complaint:
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


def _serialize_booking_for_admin(booking):
    return {
        "id": booking.id,
        "care_seeker_name": (booking.family.username if booking.family_id else None) or "—",
        "caregiver_name": (booking.caregiver.username if booking.caregiver_id else None) or "—",
        "service_types": booking.service_types or [],
        "person_name": booking.person_name,
        "person_age": booking.person_age,
        "date": booking.date,
        "start_time": booking.start_time,
        "duration_hours": booking.duration_hours,
        "total_amount": booking.total_amount,
        "emergency_contact_phone": booking.emergency_contact_phone,
        "service_address": booking.service_address,
        "additional_info": booking.additional_info,
        "status": booking.status,
        "created_at": booking.created_at,
    }


class AdminBookingListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        bookings = Booking.objects.select_related("family", "caregiver").order_by("-created_at")
        data = [_serialize_booking_for_admin(b) for b in bookings]
        return Response(data, status=status.HTTP_200_OK)


class AdminBookingDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    ALLOWED_STATUSES = {
        "pending",
        "accepted",
        "completion_requested",
        "completed",
        "rejected",
        "expired",
    }

    def get(self, request, pk):
        booking = get_object_or_404(
            Booking.objects.select_related("family", "caregiver"),
            pk=pk,
        )
        return Response(_serialize_booking_for_admin(booking), status=status.HTTP_200_OK)

    def patch(self, request, pk):
        booking = get_object_or_404(
            Booking.objects.select_related("family", "caregiver"),
            pk=pk,
        )
        new_status = request.data.get("status")

        if new_status not in self.ALLOWED_STATUSES:
            return Response(
                {
                    "error": (
                        "Invalid status. Must be one of: pending, accepted, "
                        "completion_requested, completed, rejected, expired"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = new_status
        booking.save(update_fields=["status"])
        return Response(_serialize_booking_for_admin(booking), status=status.HTTP_200_OK)