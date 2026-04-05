from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateAPIView
from accounts.serializers import *
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from .models import *
from notifications.models import PushToken
from verifications.models import CaregiverVerification
from verifications.permissions import IsCaregiver
from bookings.permissions import IsCareSeeker
from reviews.models import Review
from django.db.models import Avg, Count, Sum
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from bookings.models import Booking
from notifications.utils import send_push_notification


def get_tokens_for_user(user):
    # creating JWT tokens that the frontend stores and sends with each request
    refresh = RefreshToken.for_user(user)

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def _is_mobile_request(request):
    source = (request.headers.get("X-Client-Source") or request.data.get("client_source") or "").strip().lower()
    if source == "mobile":
        return True
    user_agent = (request.headers.get("User-Agent") or "").lower()
    return "expo" in user_agent or "react native" in user_agent or "mobile" in user_agent


def _record_user_activity(user, activity_type, booking=None):
    if not user:
        return None

    booking_obj = booking
    if booking_obj is not None and not isinstance(booking_obj, Booking):
        booking_obj = None

    return UserActivity.objects.create(
        user=user,
        activity_type=activity_type,
        booking=booking_obj,
    )


def _get_admin_push_tokens():
    tokens = []
    for admin_user in User.objects.filter(role="admin", is_active=True):
        record = getattr(admin_user, "push_token_record", None)
        if record and record.token:
            tokens.append(record.token)
            continue
        if admin_user.push_token:
            tokens.append(admin_user.push_token)
    return tokens


def _notify_admin_emergency(emergency):
    title = "Emergency alert"
    body = f"{emergency.careseeker.username} triggered an emergency alert."
    payload = {
        "type": "emergency",
        "emergency_id": emergency.id,
        "booking_id": emergency.booking_id,
        "status": emergency.status,
    }

    for token in _get_admin_push_tokens():
        send_push_notification(token, title, body, payload)


class UserRegistrationView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user=serializer.save()
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            return Response(
                {"message": "Email verified successfully"},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class UserLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        is_mobile = _is_mobile_request(request)

        if serializer.is_valid(raise_exception=True):
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            authenticated_user = authenticate(
                request,
                username=email,
                password=password
            )

            if authenticated_user is not None:
                # not verified yet? can't log in unless they're an admin
                if not authenticated_user.is_verified and authenticated_user.role != 'admin':
                    return Response(
                        {"error": "Email not verified. Please verify OTP."},
                        status=status.HTTP_403_FORBIDDEN
                    )

                token = get_tokens_for_user(authenticated_user)

                if is_mobile:
                    _record_user_activity(authenticated_user, UserActivity.ACTIVITY_MOBILE_LOGIN)

                # frontend needs all this to know who they are and where to send them
                return Response(
                    {
                        "token": token["access"],
                        "refresh": token["refresh"],
                        "role": authenticated_user.role,
                        "email": authenticated_user.email,
                        "user_id": authenticated_user.id,
                        "name": authenticated_user.username,
                        "message": "Login Successful"
                    },
                    status=status.HTTP_200_OK
                )

            return Response(
                {"error": "Email or password is incorrect"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    
class UserProfileView(APIView):
    # get returns both basic profile + caregiver-specific stuff if they're a caregiver
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        # create if missing (defensive)
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=request.user)
            
        serializer = UserProfileSerializer(
            profile,
            context={"request": request}
        )

        data = serializer.data

        # caregivers get extra fields displayed on their profile
        if request.user.role == 'caregiver':
            try:
                caregiver_profile = request.user.caregiver_profile
            except CaregiverProfile.DoesNotExist:
                caregiver_profile = CaregiverProfile.objects.create(user=request.user)
                
            caregiver_serializer = CaregiverProfileSerializer(caregiver_profile)
            data['caregiver_details'] = caregiver_serializer.data
            
            # frontend shows a badge if they're verified
            try:
                verification = request.user.verification
                data['verification_status'] = verification.verification_status
            except CaregiverVerification.DoesNotExist:
                data['verification_status'] = None

            # showing their rating on the profile card
            agg = Review.objects.filter(caregiver=request.user).aggregate(
                avg_rating=Avg("rating"),
                review_count=Count("id"),
            )
            data["average_rating"] = round(agg["avg_rating"] or 0, 1) if agg["review_count"] else None
            data["review_count"] = agg["review_count"] or 0

        return Response(data, status=200)

    def patch(self, request):
        # updates phone, address, profile picture
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=request.user)

        serializer = UserProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Profile updated successfully", "data": serializer.data},
                status=200
            )
        return Response(serializer.errors, status=400)

    def put(self, request):
        # PATCH and PUT do the same thing for convenience
        return self.patch(request)


class CaregiverProfileView(APIView):
    # for updating the extra fields (services, hourly rate, training info)
    def get_object(self, request):
        if request.user.role != 'caregiver':
            return None
        try:
            return request.user.caregiver_profile
        except CaregiverProfile.DoesNotExist:
            return CaregiverProfile.objects.create(user=request.user)

    def patch(self, request):
        # only handles caregiver-specific stuff
        profile = self.get_object(request)
        if not profile:
            return Response({"error": "Only caregivers can update this profile"}, status=403)

        serializer = CaregiverProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Caregiver details updated successfully", "data": serializer.data},
                status=200
            )
        return Response(serializer.errors, status=400)


class AdminUserProfileView(APIView):
    # allows admins (and public users) to view ANY caregiver's profile
    permission_classes = [IsAuthenticated]
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Same response shape as UserProfileView for consistency
        try:
            profile = target_user.profile
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=target_user)
        serializer = UserProfileSerializer(profile, context={"request": request})
        data = serializer.data
        
        if target_user.role == "caregiver":
            try:
                caregiver_profile = target_user.caregiver_profile
            except CaregiverProfile.DoesNotExist:
                caregiver_profile = CaregiverProfile.objects.create(user=target_user)
            caregiver_serializer = CaregiverProfileSerializer(caregiver_profile)
            data["caregiver_details"] = caregiver_serializer.data
            try:
                verification = target_user.verification
                data["verification_status"] = verification.verification_status
            except CaregiverVerification.DoesNotExist:
                data["verification_status"] = None

            # Include rating summary for admin view as well
            agg = Review.objects.filter(caregiver=target_user).aggregate(
                avg_rating=Avg("rating"),
                review_count=Count("id"),
            )
            data["average_rating"] = round(agg["avg_rating"] or 0, 1) if agg["review_count"] else None
            data["review_count"] = agg["review_count"] or 0
        return Response(data, status=200)


class UserChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = UserChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['password'])
        request.user.save()

        return Response(
            {"message": "Password changed successfully"},
            status=status.HTTP_200_OK
        )

class SendPasswordResetEmailView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = SendPasswordResetEmailSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            return Response(
                {"message": f"Password reset successfully sent to email"},
                status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class UserPasswordResetView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, uid, token):
        serializer = UserPasswordResetSerializer(data=request.data, context={'uid': uid, 'token': token})
        if serializer.is_valid(raise_exception=True):
            return Response(
                {"message": "Password reset successfully"},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserStatusView(APIView):
    """Get user presence status (is_online, last_seen). Used for chat presence indicator."""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "is_online": user.is_online,
            "last_seen": user.last_seen.isoformat() if user.last_seen else None,
        })


class SavePushTokenView(APIView):
    """Persist the current user's device push token for backend notifications."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SavePushTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        push_token = serializer.validated_data["push_token"]
        PushToken.objects.update_or_create(
            user=request.user,
            defaults={"token": push_token},
        )

        request.user.push_token = push_token
        request.user.save(update_fields=["push_token", "updated_at"])

        return Response({"message": "Push token saved successfully."}, status=status.HTTP_200_OK)


class CaregiverDashboardSummaryView(APIView):
    """Single endpoint for caregiver dashboard summary - stats, recent bookings, profile, earnings."""
    permission_classes = [IsAuthenticated, IsCaregiver]

    def get(self, request):
        from bookings.models import Booking
        from bookings.views import expire_pending_bookings
        from bookings.serializers import BookingSerializer
        from payments.models import Payment

        user = request.user

        # Get all caregiver bookings and expire stale pending ones
        bookings = Booking.objects.filter(caregiver=user).order_by("-created_at")
        expire_pending_bookings(bookings)

        # Re-fetch after potential expiration updates
        bookings = list(Booking.objects.filter(caregiver=user).order_by("-created_at"))

        now = timezone.localtime()

        pending_requests = sum(1 for b in bookings if b.status == "pending")
        upcoming_bookings = sum(
            1
            for b in bookings
            if b.status in ("accepted", "completion_requested")
            and b.end_datetime > now
        )
        completed_services = sum(1 for b in bookings if b.status == "completed")

        # Total earnings: completed payments for completed bookings
        completed_booking_ids = [b.id for b in bookings if b.status == "completed"]
        earnings_agg = Payment.objects.filter(
            booking_id__in=completed_booking_ids,
            status="completed",
        ).aggregate(total=Sum("amount"))
        total_earnings = float(earnings_agg["total"] or 0)

        # Recent 3 requests (serialized for UI)
        recent_requests = bookings[:3]
        recent_serializer = BookingSerializer(
            recent_requests,
            many=True,
            context={"request": request},
        )

        # Profile info
        try:
            caregiver_profile = user.caregiver_profile
            service_types = caregiver_profile.service_types or []
            hourly_rate = float(caregiver_profile.hourly_rate or 0)
            available_hours = caregiver_profile.available_hours or ""
        except CaregiverProfile.DoesNotExist:
            service_types = []
            hourly_rate = 0
            available_hours = ""

        try:
            verification = user.verification
            verification_status = verification.verification_status
        except CaregiverVerification.DoesNotExist:
            verification_status = "pending"

        # Earnings summary
        completed_count = completed_services
        avg_per_booking = total_earnings / completed_count if completed_count > 0 else 0

        return Response({
            "pending_requests": pending_requests,
            "upcoming_bookings": upcoming_bookings,
            "completed_services": completed_services,
            "total_earnings": round(total_earnings, 2),
            "recent_requests": recent_serializer.data,
            "profile": {
                "verification_status": verification_status,
                "service_types": service_types,
                "hourly_rate": hourly_rate,
                "available_hours": available_hours,
            },
            "earnings_summary": {
                "total_earnings": round(total_earnings, 2),
                "completed_count": completed_count,
                "average_per_booking": round(avg_per_booking, 2),
            },
        })


class CareseekerDashboardSummaryView(APIView):
    """Single endpoint for careseeker dashboard summary."""
    permission_classes = [IsAuthenticated, IsCareSeeker]

    def get(self, request):
        from bookings.models import Booking
        from bookings.views import expire_pending_bookings
        from bookings.serializers import BookingSerializer

        user = request.user

        # Get all careseeker bookings and expire stale pending ones
        bookings = Booking.objects.filter(family=user).order_by("-created_at")
        expire_pending_bookings(bookings)

        # Re-fetch after potential expiration updates
        bookings = list(Booking.objects.filter(family=user).order_by("-created_at"))

        now = timezone.localtime()

        # Active = accepted or completion_requested, end time in future
        active_bookings = sum(
            1
            for b in bookings
            if b.status in ("accepted", "completion_requested") and b.end_datetime > now
        )
        pending_requests = sum(1 for b in bookings if b.status == "pending")
        completed_services = sum(1 for b in bookings if b.status == "completed")
        total_bookings = len(bookings)

        # Recent 3 bookings
        recent_bookings = bookings[:3]
        recent_serializer = BookingSerializer(
            recent_bookings,
            many=True,
            context={"request": request},
        )

        # Care history: avg session duration, most used service type
        completed = [b for b in bookings if b.status == "completed"]
        avg_duration = (
            sum(b.duration_hours for b in completed) / len(completed)
            if completed
            else 0
        )
        service_counts = {}
        for b in completed:
            for s in b.service_types or []:
                service_counts[s] = service_counts.get(s, 0) + 1
        most_used_service = (
            max(service_counts, key=service_counts.get) if service_counts else None
        )

        # Notifications derived from recent booking activity
        notifications = []
        for b in bookings[:10]:
            if b.status == "accepted":
                notifications.append({
                    "type": "accepted",
                    "message": f"Caregiver {b.caregiver.username} accepted your booking",
                    "created_at": b.created_at.isoformat(),
                    "booking_id": b.id,
                })
            elif b.status == "expired":
                notifications.append({
                    "type": "expired",
                    "message": "Booking request expired",
                    "created_at": b.created_at.isoformat(),
                    "booking_id": b.id,
                })
            elif b.status == "completed":
                notifications.append({
                    "type": "completed",
                    "message": "Service completed",
                    "created_at": b.created_at.isoformat(),
                    "booking_id": b.id,
                })
        notifications = sorted(
            notifications,
            key=lambda x: x["created_at"],
            reverse=True,
        )[:5]

        return Response({
            "active_bookings": active_bookings,
            "pending_requests": pending_requests,
            "completed_services": completed_services,
            "total_bookings": total_bookings,
            "recent_bookings": recent_serializer.data,
            "notifications": notifications,
            "care_history": {
                "total_completed": completed_services,
                "average_session_duration": round(avg_duration, 1),
                "most_used_service_type": most_used_service,
            },
        })


class CareseekerBookingListView(APIView):
    """List all bookings for the authenticated careseeker."""
    permission_classes = [IsAuthenticated, IsCareSeeker]

    def get(self, request):
        from bookings.models import Booking
        from bookings.views import expire_pending_bookings
        from bookings.serializers import BookingSerializer

        bookings = Booking.objects.filter(family=request.user).order_by("-created_at")
        expire_pending_bookings(bookings)
        bookings = Booking.objects.filter(family=request.user).order_by("-created_at")

        serializer = BookingSerializer(bookings, many=True, context={"request": request})
        return Response(serializer.data)


class CareseekerBookingDetailView(APIView):
    """Return a single booking for the authenticated careseeker."""
    permission_classes = [IsAuthenticated, IsCareSeeker]

    def get(self, request, pk):
        from bookings.models import Booking
        from bookings.serializers import BookingSerializer

        try:
            booking = Booking.objects.get(pk=pk, family=request.user)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        if _is_mobile_request(request):
            _record_user_activity(request.user, UserActivity.ACTIVITY_BOOKING_VIEWED, booking)

        serializer = BookingSerializer(booking, context={"request": request})
        return Response(serializer.data)


class NotificationsView(APIView):
    """Returns notifications for the current user (careseeker or caregiver)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from bookings.models import Booking
        from bookings.views import expire_pending_bookings

        user = request.user

        if user.role == "careseeker":
            bookings = Booking.objects.filter(family=user).order_by("-created_at")
        elif user.role == "caregiver":
            bookings = Booking.objects.filter(caregiver=user).order_by("-created_at")
        else:
            return Response({"notifications": []})

        expire_pending_bookings(bookings)
        if user.role == "careseeker":
            bookings = list(Booking.objects.filter(family=user).order_by("-created_at")[:20])
        else:
            bookings = list(Booking.objects.filter(caregiver=user).order_by("-created_at")[:20])

        notifications = []
        for b in bookings:
            if user.role == "careseeker":
                if b.status == "accepted":
                    notifications.append({
                        "type": "accepted",
                        "message": f"Caregiver {b.caregiver.username} accepted your booking",
                        "created_at": b.created_at.isoformat(),
                        "booking_id": b.id,
                    })
                elif b.status == "expired":
                    notifications.append({
                        "type": "expired",
                        "message": "Booking request expired",
                        "created_at": b.created_at.isoformat(),
                        "booking_id": b.id,
                    })
                elif b.status == "completed":
                    notifications.append({
                        "type": "completed",
                        "message": "Service completed",
                        "created_at": b.created_at.isoformat(),
                        "booking_id": b.id,
                    })
                elif b.status == "rejected":
                    notifications.append({
                        "type": "rejected",
                        "message": f"Caregiver {b.caregiver.username} declined your booking",
                        "created_at": b.created_at.isoformat(),
                        "booking_id": b.id,
                    })
            else:
                if b.status == "pending":
                    notifications.append({
                        "type": "new_request",
                        "message": f"New booking request from {b.family.username}",
                        "created_at": b.created_at.isoformat(),
                        "booking_id": b.id,
                    })
                elif b.status == "expired":
                    notifications.append({
                        "type": "expired",
                        "message": "Booking request expired",
                        "created_at": b.created_at.isoformat(),
                        "booking_id": b.id,
                    })
                elif b.status == "completed":
                    notifications.append({
                        "type": "completed",
                        "message": "Service completed",
                        "created_at": b.created_at.isoformat(),
                        "booking_id": b.id,
                    })
                elif b.status in ("accepted", "completion_requested"):
                    notifications.append({
                        "type": "accepted",
                        "message": f"Booking with {b.family.username} accepted",
                        "created_at": b.created_at.isoformat(),
                        "booking_id": b.id,
                    })

        notifications = sorted(
            notifications,
            key=lambda x: x["created_at"],
            reverse=True,
        )

        return Response({"notifications": notifications})


class EmergencyListCreateView(APIView):
    """Admin lists emergencies; careseekers can create one from mobile."""

    def get_permissions(self):
        if self.request.method.lower() == "post":
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]

    def get(self, request):
        emergencies = Emergency.objects.select_related(
            "careseeker",
            "careseeker__profile",
            "booking",
            "booking__caregiver",
        ).all()
        serializer = EmergencySerializer(emergencies, many=True, context={"request": request})
        return Response({"emergencies": serializer.data})

    def post(self, request):
        if request.user.role != "careseeker":
            return Response({"error": "Only careseekers can trigger an emergency"}, status=status.HTTP_403_FORBIDDEN)

        serializer = EmergencyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking_id = serializer.validated_data.get("booking_id")
        booking = None

        if booking_id:
            try:
                booking = Booking.objects.get(pk=booking_id, family=request.user)
            except Booking.DoesNotExist:
                return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        emergency = Emergency.objects.create(
            careseeker=request.user,
            booking=booking,
            status=Emergency.STATUS_PENDING,
        )

        _record_user_activity(request.user, UserActivity.ACTIVITY_EMERGENCY_TRIGGERED, booking)
        _notify_admin_emergency(emergency)

        return Response(EmergencySerializer(emergency, context={"request": request}).data, status=status.HTTP_201_CREATED)


class EmergencyDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, pk):
        try:
            emergency = Emergency.objects.select_related("careseeker", "careseeker__profile", "booking").get(pk=pk)
        except Emergency.DoesNotExist:
            return Response({"error": "Emergency not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = EmergencyUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if "status" in serializer.validated_data:
            emergency.status = serializer.validated_data["status"]

        if "admin_note" in serializer.validated_data:
            emergency.admin_note = serializer.validated_data["admin_note"] or ""

        emergency.save()
        return Response(EmergencySerializer(emergency, context={"request": request}).data, status=status.HTTP_200_OK)


class EmergencyPendingCountView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        count = Emergency.objects.filter(status=Emergency.STATUS_PENDING).count()
        return Response({"count": count}, status=status.HTTP_200_OK)


class EmergencyNotifyCaregiverView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def _notify(self, request, pk):
        try:
            emergency = Emergency.objects.select_related(
                "careseeker",
                "careseeker__profile",
                "booking",
                "booking__caregiver",
            ).get(pk=pk)
        except Emergency.DoesNotExist:
            return Response({"error": "Emergency not found"}, status=status.HTTP_404_NOT_FOUND)

        booking = emergency.booking
        caregiver = booking.caregiver if booking and booking.caregiver_id else None
        if not caregiver:
            return Response({"error": "No caregiver assigned to this booking"}, status=status.HTTP_400_BAD_REQUEST)

        caregiver_email = (caregiver.email or "").strip()
        if not caregiver_email:
            return Response({"error": "Caregiver email is unavailable"}, status=status.HTTP_400_BAD_REQUEST)

        message_override = (request.data.get("message") or "").strip()
        careseeker_profile = getattr(emergency.careseeker, "profile", None)
        careseeker_phone = getattr(careseeker_profile, "phone", None) or "N/A"

        subject = "⚠ Emergency Alert - Action Required | CareNest"
        triggered_time = timezone.localtime(emergency.created_at).strftime("%b %d, %Y %I:%M %p")

        body = (
            f"Dear {caregiver.username},\n\n"
            f"A careseeker under your care, {emergency.careseeker.username}, \n"
            f"has triggered an emergency alert at {triggered_time}.\n\n"
            "Please check on them immediately and contact \n"
            "the admin if further assistance is needed.\n\n"
            f"Booking ID: {emergency.booking_id or 'N/A'}\n"
            f"Careseeker Phone: {careseeker_phone}\n\n"
            "Regards,\n"
            "CareNest Admin Team"
        )

        if message_override:
            body = f"{body}\n\nAdmin Message:\n{message_override}"

        send_mail(
            subject,
            body,
            settings.EMAIL_HOST_USER,
            [caregiver_email],
            fail_silently=False,
        )

        return Response({"message": "Caregiver notified via email"}, status=status.HTTP_200_OK)

    def post(self, request, pk):
        return self._notify(request, pk)

    def patch(self, request, pk):
        return self._notify(request, pk)


class UserActivityView(APIView):
    def get_permissions(self):
        if self.request.method.lower() == "post":
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]

    def get(self, request):
        today = timezone.localdate()
        activities = (
            UserActivity.objects.select_related("user", "user__profile", "booking")
            .filter(user__role="careseeker")
            .order_by("-created_at")[:50]
        )

        summary = {
            "total_emergencies_today": Emergency.objects.filter(created_at__date=today).count(),
            "active_emergencies": Emergency.objects.filter(status__in=[Emergency.STATUS_PENDING, Emergency.STATUS_IN_PROGRESS]).count(),
            "careseeker_mobile_logins_today": UserActivity.objects.filter(
                activity_type=UserActivity.ACTIVITY_MOBILE_LOGIN,
                created_at__date=today,
                user__role="careseeker",
            ).count(),
        }

        serializer = UserActivitySerializer(activities, many=True, context={"request": request})
        return Response({"summary": summary, "activities": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = UserActivityCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        booking = None
        booking_id = serializer.validated_data.get("booking_id")
        if booking_id:
            try:
                booking = Booking.objects.get(pk=booking_id)
            except Booking.DoesNotExist:
                return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        activity = _record_user_activity(request.user, serializer.validated_data["activity_type"], booking)
        return Response(UserActivitySerializer(activity, context={"request": request}).data, status=status.HTTP_201_CREATED)