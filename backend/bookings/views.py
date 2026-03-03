from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .permissions import IsCareSeeker

    # Removed BookingCancelView
from django.utils import timezone
from accounts.models import User, CaregiverProfile
from verifications.models import CaregiverVerification
from .models import Booking
from .serializers import CaregiverListSerializer, BookingCreateSerializer, BookingSerializer
from .permissions import IsCareSeeker
from verifications.permissions import IsCaregiver


def get_verified_caregiver_ids():
    """Returns set of user IDs for approved caregivers only"""
    return set(
        CaregiverVerification.objects.filter(verification_status="approved").values_list(
            "user_id", flat=True
        )
    )


def get_active_bookings_for_caregiver(caregiver_id):
    """
    Returns active bookings for a caregiver that are still ongoing or in the future.
    
    A booking is considered "active" and blocks availability when:
    1. Its status is 'accepted' or 'paid' (confirmed bookings)
    2. Its end time is still in the future (not yet completed)
    
    Past bookings (even if status is 'accepted'/'paid') are automatically 
    considered completed and don't block availability.
    """
    now = timezone.now()
    
    # Get all accepted/paid bookings for this caregiver
    bookings = Booking.objects.filter(
        caregiver_id=caregiver_id,
        status__in=["accepted", "paid"]
    )
    
    # Filter to only those that are still ongoing or in the future
    # We use Python filtering because end_datetime is a computed property
    active_bookings = [b for b in bookings if b.end_datetime > now]
    
    return active_bookings


def caregiver_has_overlap(caregiver_id, date, start_time, duration_hours, exclude_booking_id=None):
    """
    Check if a caregiver has any overlapping active bookings for the given time slot.
    
    This is the core availability check used when:
    - Creating a new booking
    - Accepting a booking request
    
    Args:
        caregiver_id: The caregiver to check
        date: The proposed booking date
        start_time: The proposed start time
        duration_hours: The proposed duration
        exclude_booking_id: Optional booking ID to exclude (used when checking existing booking)
        
    Returns:
        True if there's an overlap (caregiver is NOT available), False otherwise
    """
    active_bookings = get_active_bookings_for_caregiver(caregiver_id)
    
    for booking in active_bookings:
        # Skip the booking we're checking (for update scenarios)
        if exclude_booking_id and booking.id == exclude_booking_id:
            continue
            
        if booking.overlaps_with(date, start_time, duration_hours):
            return True
    
    return False


class VerifiedCaregiverListView(APIView):
    """Lists only verified caregivers - used in Find Caregiver page"""
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

        # Prevent duplicate active bookings with same caregiver
        existing_booking = Booking.objects.filter(
            family=request.user,
            caregiver=caregiver,
            status__in=["pending", "accepted"]
        ).first()
        
        if existing_booking:
            return Response(
                {"error": "You already have an active booking request with this caregiver"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BookingCreateSerializer(data=request.data)
        if serializer.is_valid():
            # Extract booking details for overlap check
            date = serializer.validated_data.get("date")
            start_time = serializer.validated_data.get("start_time")
            duration_hours = serializer.validated_data.get("duration_hours", 1)
            
            # Check if the caregiver has any overlapping active bookings for this time slot
            # This ensures we don't double-book a caregiver even if they have multiple requests
            if caregiver_has_overlap(caregiver_id, date, start_time, duration_hours):
                return Response(
                    {"error": "This caregiver is not available during the selected time slot. Please choose a different date/time."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Calculate total_amount from caregiver's hourly_rate
            try:
                caregiver_profile = CaregiverProfile.objects.get(user=caregiver)
                hourly_rate = caregiver_profile.hourly_rate or 0
            except CaregiverProfile.DoesNotExist:
                hourly_rate = 0
            
            total_amount = float(hourly_rate) * duration_hours
            
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


class BookingListView(APIView):
    """Returns bookings based on user role - sent vs received"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
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
        serializer = BookingSerializer(bookings, many=True, context={"request": request})
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
        if booking.status != "pending":
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
        booking.save()
        return Response(BookingSerializer(booking, context={"request": request}).data)
