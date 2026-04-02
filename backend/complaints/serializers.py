from rest_framework import serializers
from .models import Complaint
from bookings.models import Booking


class ComplaintSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(required=False, allow_null=True)
    booking_date = serializers.DateField(source="booking.date", read_only=True)

    class Meta:
        model = Complaint
        fields = ["id", "booking_id", "booking_date", "category", "description", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]

    def create(self, validated_data):
        booking_id = validated_data.pop("booking_id", None)
        booking = None
        reported_user = None

        if booking_id:
            try:
                booking = Booking.objects.get(id=booking_id)
                # The reported user should be the caregiver in the booking
                reported_user = booking.caregiver
            except Booking.DoesNotExist:
                pass

        complaint = Complaint.objects.create(
            booking=booking,
            reported_user=reported_user,
            **validated_data
        )
        return complaint
