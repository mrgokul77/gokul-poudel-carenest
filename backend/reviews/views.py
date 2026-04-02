from django.db.models import Avg, Count
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking
from .models import Review

from rest_framework.generics import ListAPIView
from .serializers import ReviewSerializer
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
                {"error": "Only careseekers can submit reviews."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.family != request.user:
            return Response(
                {"error": "You can only review your own bookings."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != "completed":
            return Response(
                {"error": "You can only review completed bookings."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Review.objects.filter(booking=booking).exists():
            return Response(
                {"error": "Review already submitted"},
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

