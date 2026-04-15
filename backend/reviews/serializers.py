from rest_framework import serializers

from bookings.models import Booking
from .models import Review
from backend.error_messages import ErrorMessages


class ReviewSerializer(serializers.ModelSerializer):
    """Create/read reviews with strict 1–5 rating."""

    booking_id = serializers.IntegerField(write_only=True)
    caregiver_id = serializers.IntegerField(write_only=True)
    review_text = serializers.CharField(write_only=True, required=False, allow_blank=True)
    careseeker_name = serializers.CharField(source="careseeker.username", read_only=True)
    careseeker_profile_image = serializers.SerializerMethodField()
    service_types = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "booking_id",
            "caregiver_id",
            "caregiver",
            "careseeker",
            "careseeker_name",
            "careseeker_profile_image",
            "service_types",
            "rating",
            "review_text",
            "comment",
            "created_at",
        ]
        read_only_fields = ["id", "caregiver", "careseeker", "created_at"]

    def get_careseeker_profile_image(self, obj):
        try:
            profile = obj.careseeker.profile
            if profile and profile.profile_image:
                return profile.profile_image.name
        except Exception:
            pass
        return None

    def get_service_types(self, obj):
        try:
            return obj.booking.service_types or []
        except Exception:
            return []

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError(ErrorMessages.REVIEW_RATING_REQUIRED)
        return value

    def validate_booking_id(self, value):
        try:
            booking = Booking.objects.get(id=value)
        except Booking.DoesNotExist:
            raise serializers.ValidationError(ErrorMessages.BOOKING_EXPIRED)
        self.context["booking"] = booking
        return value

    def validate_caregiver_id(self, value):
        booking = self.context.get("booking")
        if not booking:
            raise serializers.ValidationError(ErrorMessages.BOOKING_REQUIRED_FIELDS)
        if booking.caregiver_id != value:
            raise serializers.ValidationError("caregiver_id does not match the booking caregiver.")
        return value

    def create(self, validated_data):
        booking = self.context["booking"]
        request = self.context.get("request")
        user = getattr(request, "user", None)

        # Safeguard – view should already enforce these conditions
        if not user or not user.is_authenticated or user.role != "careseeker":
            raise serializers.ValidationError("Only careseekers can create reviews.")

        if booking.family != user:
            raise serializers.ValidationError("You can only review your own bookings.")

        if booking.status != "completed":
            raise serializers.ValidationError(ErrorMessages.REVIEW_PAYMENT_REQUIRED)

        if hasattr(booking, "review") or Review.objects.filter(booking=booking).exists():
            raise serializers.ValidationError("A review has already been submitted for this booking.")

        rating = validated_data["rating"]
        review_text = validated_data.get("review_text", "")
        if not (review_text or "").strip():
            raise serializers.ValidationError(ErrorMessages.REVIEW_TEXT_REQUIRED)
        comment = validated_data.get("comment", review_text).strip()

        review = Review.objects.create(
            booking=booking,
            caregiver=booking.caregiver,
            careseeker=user,
            rating=rating,
            comment=comment,
        )
        return review

