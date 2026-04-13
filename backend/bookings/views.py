from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .permissions import IsCareSeeker
from django.utils import timezone
from django.conf import settings
from datetime import datetime, timedelta
from accounts.models import User, CaregiverProfile, UserActivity
from verifications.models import CaregiverVerification
from .models import Booking
from .serializers import (
    CaregiverListSerializer,
    BookingCreateSerializer,
    BookingSerializer,
    BookingStatusUpdateSerializer,
    BookingProofUploadSerializer,
)
from .permissions import IsCareSeeker
from verifications.permissions import IsCaregiver
import pytz
from notifications.models import Notification


def _is_mobile_request(request):
    source = (request.headers.get("X-Client-Source") or "").strip().lower()
    if source == "mobile":
        return True
    user_agent = (request.headers.get("User-Agent") or "").lower()
    return "expo" in user_agent or "react native" in user_agent or "mobile" in user_agent


PENDING_RESPONSE_WINDOW_MINUTES = 30
IN_PROGRESS_AUTO_EXPIRE_HOURS = 3
AUTO_REJECTION_REASON = "Caregiver unavailable at this time. Please choose another caregiver."
MANUAL_REJECTION_REASON = "Caregiver declined your booking. Please choose another caregiver."
MINIMUM_ADVANCE_BOOKING_HOURS = 1


def expire_pending_bookings(queryset=None):
    # if a caregiver doesn't respond in 30 mins, auto-expire the request
    try:
        now = timezone.now()
        cutoff = now - timedelta(minutes=PENDING_RESPONSE_WINDOW_MINUTES)
        pending_bookings = (
            queryset.filter(status="pending")
            if queryset is not None
            else Booking.objects.filter(status="pending")
        )

        for booking in pending_bookings:
            try:
                if booking.created_at < cutoff:
                    booking.status = "expired"
                    booking.save(update_fields=["status", "updated_at"])

                    expiry_message = "Booking request expired due to no response from caregiver within 30 minutes."
                    Notification.objects.create(
                        user=booking.family,
                        type="booking",
                        title="Booking Expired",
                        message=expiry_message,
                        related_id=booking.id,
                    )
                    Notification.objects.create(
                        user=booking.caregiver,
                        type="booking",
                        title="Booking Request Expired",
                        message=expiry_message,
                        related_id=booking.id,
                    )
            except Exception:
                continue
    except Exception:
        pass


def expire_stale_in_progress_bookings(queryset):
    # if a service runs 3 hours past its scheduled end, auto-expire it
    now = timezone.localtime()
    expiry_cutoff = now - timedelta(hours=IN_PROGRESS_AUTO_EXPIRE_HOURS)
    for booking in queryset.filter(status="in_progress"):
        if booking.end_datetime <= expiry_cutoff:
            booking.status = "expired"
            booking.save()


def get_verified_caregiver_ids():
    # only caregivers who passed admin verification can accept bookings
    return set(
        CaregiverVerification.objects.filter(verification_status="approved").values_list(
            "user_id", flat=True
        )
    )


def get_active_bookings_for_caregiver(caregiver_id):
    # returns bookings that are actually happening right now or in the future
    # we filter by end_datetime in Python instead of the DB because it's a calculated property
    now = timezone.localtime()
    
    bookings = Booking.objects.filter(
        caregiver_id=caregiver_id,
        status__in=["accepted", "completion_requested"]
    )
    
    active_bookings = [b for b in bookings if b.end_datetime > now]
    
    return active_bookings


def caregiver_has_overlap(caregiver_id, date, start_time, duration_hours, exclude_booking_id=None):
    # checks if a caregiver is already booked during the requested time
    # TODO: optimize this with better interval logic
    active_bookings = get_active_bookings_for_caregiver(caregiver_id)
    
    for booking in active_bookings:
        if exclude_booking_id and booking.id == exclude_booking_id:
            continue
            
        if booking.overlaps_with(date, start_time, duration_hours):
            return True
    
    return False


def check_caregiver_overlap(caregiver, booking):
    try:
        new_date = booking.date
        new_start = datetime.strptime(
            f"{new_date} {str(booking.start_time)[:5]}",
            "%Y-%m-%d %H:%M",
        )
        new_end = new_start + timedelta(
            hours=float(booking.duration_hours or 1)
        )

        # Only compare against already accepted/in-progress bookings on the same date.
        existing = Booking.objects.filter(
            caregiver=caregiver,
            date=new_date,
            status__in=["accepted", "in_progress"],
        ).exclude(id=booking.id)

        if not existing.exists():
            return False, None

        for b in existing:
            try:
                b_start = datetime.strptime(
                    f"{b.date} {str(b.start_time)[:5]}",
                    "%Y-%m-%d %H:%M",
                )
                b_end = b_start + timedelta(
                    hours=float(b.duration_hours or 1)
                )

                if new_start < b_end and new_end > b_start:
                    return True, b.id
            except Exception:
                continue

        return False, None
    except Exception:
        return False, None


class VerifiedCaregiverListView(APIView):
    # returns caregivers that can accept bookings - verified with complete profiles
    permission_classes = [IsAuthenticated, IsCareSeeker]

    def get(self, request):
        verified_ids = get_verified_caregiver_ids()
        
        # Filter only caregivers who are ready for booking:
        # - verified, has service_types, and available_hours
        profiles = (
            CaregiverProfile.objects.filter(user_id__in=verified_ids)
            .exclude(service_types=[])  # must have at least one service
            .exclude(available_hours="")  # must have available hours
            .select_related("user", "user__profile")
        )
        
        # Optional filters from query params
        location = request.query_params.get("location", "").strip()
        if location:
            profiles = profiles.filter(user__profile__address__icontains=location)
        
        gender = request.query_params.get("gender", "").strip()
        if gender and gender.lower() != "all":
            profiles = profiles.filter(gender=gender.lower())
        
        serializer = CaregiverListSerializer(profiles, many=True, context={"request": request})
        return Response(serializer.data)


class BookingCreateView(APIView):
    """Family creates booking request - only for verified caregivers"""
    permission_classes = [IsAuthenticated, IsCareSeeker]

    def post(self, request):
        caregiver_id = request.data.get("caregiver")
        if not caregiver_id:
            return Response(
                {"error": "Caregiver is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Convert to int (frontend sends as string from JSON)
        try:
            caregiver_id = int(caregiver_id)
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid caregiver ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Only allow booking with verified caregivers
        verified_ids = get_verified_caregiver_ids()
        if caregiver_id not in verified_ids:
            return Response(
                {"error": "Caregiver is not verified or does not exist"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            caregiver = User.objects.get(id=caregiver_id, role="caregiver")
        except User.DoesNotExist:
            return Response(
                {"error": "Caregiver not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = BookingCreateSerializer(data=request.data)
        if settings.DEBUG:
            print("REQUEST DATA (booking create):", dict(request.data))
        if serializer.is_valid():
            # Extract booking details for overlap check
            date = serializer.validated_data.get("date")
            start_time = serializer.validated_data.get("start_time")
            duration_hours = serializer.validated_data.get("duration_hours", 1)

            # Enforce minimum one-hour advance booking time in Nepal timezone.
            try:
                nepal_tz = pytz.timezone("Asia/Kathmandu")
                now_np = timezone.now().astimezone(nepal_tz)
                booking_dt_np = nepal_tz.localize(datetime.combine(date, start_time))
                if booking_dt_np < now_np + timedelta(hours=MINIMUM_ADVANCE_BOOKING_HOURS):
                    return Response(
                        {
                            "error": "Booking must be at least 1 hour in advance from current time."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Exception:
                pass

            booking_stub = Booking(
                family=request.user,
                caregiver=caregiver,
                date=date,
                start_time=start_time,
                duration_hours=duration_hours,
            )

            is_available = True
            conflict_id = None
            try:
                is_available, conflict_id = check_caregiver_overlap(caregiver, booking_stub)
            except Exception:
                is_available = True
                conflict_id = None
            
            # Calculate total_amount from caregiver's hourly_rate
            try:
                caregiver_profile = CaregiverProfile.objects.get(user=caregiver)
                hourly_rate = caregiver_profile.hourly_rate or 0
            except CaregiverProfile.DoesNotExist:
                hourly_rate = 0
            
            total_amount = float(hourly_rate) * duration_hours

            if not is_available:
                booking = serializer.save(
                    family=request.user,
                    caregiver=caregiver,
                    status="rejected",
                    total_amount=total_amount,
                    rejection_reason=AUTO_REJECTION_REASON,
                )
                response_data = BookingSerializer(booking, context={"request": request}).data
                response_data["message"] = AUTO_REJECTION_REASON
                if conflict_id:
                    response_data["conflict_booking_id"] = conflict_id
                return Response(response_data, status=status.HTTP_201_CREATED)
            
            booking = serializer.save(
                family=request.user,
                caregiver=caregiver,
                status="pending",
                total_amount=total_amount,
            )
            return Response(
                BookingSerializer(booking, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CheckAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            caregiver_id = request.query_params.get("caregiver_id")
            date = request.query_params.get("date")
            start_time = request.query_params.get("start_time")
            duration = float(request.query_params.get("duration_hours", 1))

            if not all([caregiver_id, date, start_time]):
                return Response({"is_available": True})

            new_start = datetime.strptime(
                f"{date} {start_time[:5]}",
                "%Y-%m-%d %H:%M",
            )
            new_end = new_start + timedelta(hours=duration)

            existing = Booking.objects.filter(
                caregiver_id=caregiver_id,
                date=date,
                status__in=["accepted", "in_progress", "awaiting_confirmation"],
            )

            for booking in existing:
                try:
                    booking_start = datetime.strptime(
                        f"{booking.date} {str(booking.start_time)[:5]}",
                        "%Y-%m-%d %H:%M",
                    )
                    booking_end = booking_start + timedelta(hours=float(booking.duration_hours or 1))
                    if new_start < booking_end and new_end > booking_start:
                        return Response(
                            {
                                "is_available": False,
                                "message": (
                                    "Caregiver is already booked from "
                                    + booking_start.strftime("%I:%M %p")
                                    + " to "
                                    + booking_end.strftime("%I:%M %p")
                                    + ". Please choose a different time."
                                ),
                            }
                        )
                except Exception:
                    continue

            return Response({"is_available": True})
        except Exception:
            return Response({"is_available": True})


class BookingListView(APIView):
    """Returns bookings based on user role - sent vs received"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        expire_pending_bookings()
        # Careseekers see bookings they made, caregivers see requests they received
        if request.user.role == "careseeker":
            bookings = Booking.objects.filter(family=request.user)
        elif request.user.role == "caregiver":
            bookings = Booking.objects.filter(caregiver=request.user)
        else:
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Auto-expire pending bookings that exceeded 30-minute response window
        expire_pending_bookings(bookings)
        expire_stale_in_progress_bookings(bookings)
        serializer = BookingSerializer(bookings, many=True, context={"request": request})
        return Response(serializer.data)


class BookingMarkServiceCompleteView(APIView):
    """Caregiver marks an accepted booking as completion_requested, when current time >= start_time."""
    permission_classes = [IsAuthenticated, IsCaregiver]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, caregiver=request.user)
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.status != "accepted":
            return Response(
                {"error": f"Only accepted bookings can be marked as service complete (current status: {booking.status})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.localtime()
        if now < booking.start_datetime:
            return Response(
                {"error": "You can mark service complete only after the service start time."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = "awaiting_confirmation" if _is_mobile_request(request) else "completion_requested"
        booking.save()

        serializer = BookingSerializer(booking, context={"request": request})
        return Response(serializer.data)


class BookingConfirmCompletionView(APIView):
    """Careseeker confirms completion when status is completion_requested."""
    permission_classes = [IsAuthenticated, IsCareSeeker]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, family=request.user)
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.status not in ("completion_requested", "awaiting_confirmation"):
            return Response(
                {"error": f"Only completion-requested bookings can be confirmed (current status: {booking.status})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = "completed"
        booking.save()

        if _is_mobile_request(request):
            UserActivity.objects.create(
                user=request.user,
                activity_type=UserActivity.ACTIVITY_BOOKING_COMPLETED,
                booking=booking,
            )

        serializer = BookingSerializer(booking, context={"request": request})
        return Response(serializer.data)


class BookingRespondView(APIView):
    """Caregiver accepts or rejects a booking request"""
    permission_classes = [IsAuthenticated, IsCaregiver]

    def put(self, request, pk):
        # Only the caregiver who received this booking can respond
        try:
            booking = Booking.objects.get(pk=pk, caregiver=request.user)
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Check if pending booking has expired (30-minute window)
        if booking.status == "pending":
            if timezone.now() - booking.created_at > timedelta(minutes=PENDING_RESPONSE_WINDOW_MINUTES):
                booking.status = "expired"
                booking.save()
                return Response(
                    {"error": "Booking request expired due to no response from caregiver within 30 minutes."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif booking.status != "pending":
            return Response(
                {"error": f"Booking is already {booking.status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = request.data.get("status")
        if new_status not in ("accepted", "rejected"):
            return Response(
                {"error": "Status must be accepted or rejected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # When accepting, check for time conflicts with other active bookings
        # This uses the new time-aware overlap logic that considers end times
        if new_status == "accepted":
            has_overlap = caregiver_has_overlap(
                caregiver_id=request.user.id,
                date=booking.date,
                start_time=booking.start_time,
                duration_hours=booking.duration_hours,
                exclude_booking_id=booking.id  # Don't compare booking with itself
            )
            
            if has_overlap:
                return Response(
                    {"error": "You have another booking that overlaps with this time slot. Please reject this request or complete the conflicting booking first."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        booking.status = new_status
        if new_status == "rejected":
            rejection_reason = (request.data.get("rejection_reason") or "").strip() or MANUAL_REJECTION_REASON
            booking.rejection_reason = rejection_reason
        booking.save()
        return Response(BookingSerializer(booking, context={"request": request}).data)


class AssignedBookingsView(APIView):
    """Return caregiver's assigned bookings for mobile dashboard."""
    permission_classes = [IsAuthenticated, IsCaregiver]

    def get(self, request):
        expire_pending_bookings()
        bookings = Booking.objects.filter(caregiver=request.user).order_by("-created_at")
        expire_stale_in_progress_bookings(bookings)
        serializer = BookingSerializer(bookings, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class BookingUpdateStatusView(APIView):
    """Caregiver booking lifecycle updates with strict order validation."""
    permission_classes = [IsAuthenticated, IsCaregiver]

    def patch(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, caregiver=request.user)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        expire_stale_in_progress_bookings(Booking.objects.filter(pk=booking.pk))
        booking.refresh_from_db()

        serializer = BookingStatusUpdateSerializer(data=request.data, context={"booking": booking})
        serializer.is_valid(raise_exception=True)

        requested_status = serializer.validated_data["status"]
        event_time = serializer.validated_data["parsed_timestamp"]

        if requested_status == "accepted":
            try:
                has_overlap, conflict_id = check_caregiver_overlap(
                    booking.caregiver, booking
                )
                if has_overlap:
                    return Response(
                        {
                            "error": (
                                f"You already have an accepted booking (#{conflict_id}) "
                                "that overlaps with this time slot. Please complete "
                                "or reject that booking first before accepting this one."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Exception:
                pass
            booking.status = "accepted"
        elif requested_status == "rejected":
            booking.status = "rejected"
            booking.rejection_reason = (serializer.validated_data.get("rejection_reason") or "").strip() or MANUAL_REJECTION_REASON
        elif requested_status == "in_progress":
            booking.status = "in_progress"
            booking.check_in_time = event_time
            booking.check_out_time = None
        elif requested_status in ("awaiting_confirmation", "completed"):
            booking.status = requested_status
            booking.check_out_time = event_time

        booking.save()

        if requested_status in ("awaiting_confirmation", "completed") and _is_mobile_request(request):
            UserActivity.objects.create(
                user=request.user,
                activity_type=UserActivity.ACTIVITY_BOOKING_COMPLETED,
                booking=booking,
            )

        return Response(BookingSerializer(booking, context={"request": request}).data, status=status.HTTP_200_OK)


class BookingProofUploadView(APIView):
    """Upload caregiver proof image for an in-progress booking."""
    permission_classes = [IsAuthenticated, IsCaregiver]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, caregiver=request.user)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        expire_stale_in_progress_bookings(Booking.objects.filter(pk=booking.pk))
        booking.refresh_from_db()

        if booking.status != "in_progress":
            return Response(
                {"error": "Proof upload is only allowed when booking is in_progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BookingProofUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        booking.proof_image = serializer.validated_data["proof_image"]
        booking.save(update_fields=["proof_image"])

        return Response(BookingSerializer(booking, context={"request": request}).data, status=status.HTTP_200_OK)


class BookingUpdateLocationView(APIView):
    """Assigned caregiver updates live location while service is in progress."""
    permission_classes = [IsAuthenticated, IsCaregiver]

    def patch(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, caregiver=request.user)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        expire_stale_in_progress_bookings(Booking.objects.filter(pk=booking.pk))
        booking.refresh_from_db()

        if booking.status != "in_progress":
            return Response(
                {"error": "Location updates are only allowed when booking is in_progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            latitude = float(request.data.get("latitude"))
            longitude = float(request.data.get("longitude"))
        except (TypeError, ValueError):
            return Response(
                {"error": "latitude and longitude are required numeric fields."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.caregiver_latitude = latitude
        booking.caregiver_longitude = longitude
        booking.location_updated_at = timezone.now()
        booking.save(update_fields=["caregiver_latitude", "caregiver_longitude", "location_updated_at"])

        return Response(
            {
                "latitude": float(booking.caregiver_latitude),
                "longitude": float(booking.caregiver_longitude),
                "updated_at": booking.location_updated_at,
                "is_available": True,
            },
            status=status.HTTP_200_OK,
        )


class BookingCaregiverLocationView(APIView):
    """Careseeker reads caregiver live location for their booking."""
    permission_classes = [IsAuthenticated, IsCareSeeker]

    def get(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, family=request.user)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        expire_stale_in_progress_bookings(Booking.objects.filter(pk=booking.pk))
        booking.refresh_from_db()

        has_location = (
            booking.caregiver_latitude is not None
            and booking.caregiver_longitude is not None
            and booking.location_updated_at is not None
        )

        if not has_location:
            return Response(
                {
                    "latitude": None,
                    "longitude": None,
                    "updated_at": None,
                    "is_available": False,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "latitude": float(booking.caregiver_latitude),
                "longitude": float(booking.caregiver_longitude),
                "updated_at": booking.location_updated_at,
                "is_available": True,
            },
            status=status.HTTP_200_OK,
        )
