from django.db.models import Avg, Count
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking
from .models import Review

from rest_framework.generics import ListAPIView
from .serializers import ReviewSerializer
from backend.error_messages import ErrorMessages
class ReviewListView(ListAPIView):
    # shows all reviews for a caregiver with average rating
    serializer_class = ReviewSerializer

    def get_queryset(self):
        caregiver_id = self.kwargs["caregiver_id"]
        return Review.objects.filter(caregiver_id=caregiver_id)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        avg = queryset.aggregate(avg_rating=Avg("rating"), review_count=Count("id"))
        response = super().list(request, *args, **kwargs)
        response.data = {
            "average_rating": round(avg["avg_rating"] or 0, 1),
            "review_count": avg["review_count"] or 0,
            "reviews": response.data,
        }
        return response


class ReviewCreateView(APIView):
    # careseeker can submit a review after finishing a session with a caregiver
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReviewSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        booking = serializer.context["booking"]

        if request.user.role != "careseeker":
            return Response(
                {"error": ErrorMessages.UNAUTHORIZED},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.family != request.user:
            return Response(
                {"error": "You can only review your own bookings."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != "completed":
            return Response(
                {"error": ErrorMessages.REVIEW_PAYMENT_REQUIRED},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Review.objects.filter(booking=booking).exists():
            return Response(
                {"error": "A review has already been submitted for this booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        review = serializer.save()

        # Compute caregiver's new average rating and total reviews
        agg = Review.objects.filter(caregiver=review.caregiver).aggregate(
            avg_rating=Avg("rating"),
            review_count=Count("id"),
        )

        response_data = ReviewSerializer(review).data
        response_data["average_rating"] = round(agg["avg_rating"] or 0, 1)
        response_data["review_count"] = agg["review_count"] or 0

        return Response(response_data, status=status.HTTP_201_CREATED)


class ReviewBookingStatusView(APIView):
    """Check whether a booking already has a submitted review."""

    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id: int):
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({"error": ErrorMessages.BOOKING_EXPIRED}, status=status.HTTP_404_NOT_FOUND)

        is_owner = booking.family_id == request.user.id
        is_caregiver = booking.caregiver_id == request.user.id
        is_admin = getattr(request.user, "role", None) == "admin"
        if not (is_owner or is_caregiver or is_admin):
            return Response({"error": ErrorMessages.UNAUTHORIZED}, status=status.HTTP_403_FORBIDDEN)

        review = Review.objects.filter(booking=booking).first()
        payload = {
            "booking_id": booking.id,
            "has_review": review is not None,
            "review_id": review.id if review else None,
            "rating": review.rating if review else None,
        }
        return Response(payload, status=status.HTTP_200_OK)

