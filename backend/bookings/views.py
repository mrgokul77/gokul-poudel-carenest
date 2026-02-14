from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
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


class VerifiedCaregiverListView(APIView):
    """Lists only verified caregivers - used in Find Caregiver page"""
    permission_classes = [IsAuthenticated, IsCareSeeker]

    def get(self, request):
        verified_ids = get_verified_caregiver_ids()
        profiles = CaregiverProfile.objects.filter(user_id__in=verified_ids).select_related("user", "user__profile")
        
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
            booking = serializer.save(
                family=request.user,
                caregiver=caregiver,
                status="pending",
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

        # Prevent accepting multiple bookings at once
        if new_status == "accepted":
            existing_accepted = Booking.objects.filter(
                caregiver=request.user,
                status="accepted"
            ).exclude(pk=pk).first()
            
            if existing_accepted:
                return Response(
                    {"error": "Caregiver already has an active accepted booking"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        booking.status = new_status
        booking.save()
        return Response(BookingSerializer(booking, context={"request": request}).data)
