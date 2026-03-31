from rest_framework import serializers
from .models import Payment


# Serializes all fields of the Payment model
class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"


# Lightweight serializer for payment list - includes caregiver name
class PaymentListSerializer(serializers.ModelSerializer):
    caregiver_name = serializers.SerializerMethodField(read_only=True)
    booking_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "amount",
            "status",
            "transaction_id",
            "created_at",
            "booking_id",
            "caregiver_name",
        ]

    def get_booking_id(self, obj):
        return obj.booking_id

    def get_caregiver_name(self, obj):
        try:
            if obj.booking and obj.booking.caregiver:
                return obj.booking.caregiver.username or ""
        except Exception:
            pass
        return ""

# Used for initiating Khalti payment (expects booking_id)
class KhaltiInitiateSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()

# Used for verifying Khalti payment (expects pidx)
class KhaltiVerifySerializer(serializers.Serializer):
    pidx = serializers.CharField()
