from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model"""
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            "id",
            "booking_id",
            "amount",
            "status",
            "transaction_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class KhaltiInitiateSerializer(serializers.Serializer):
    """Serializer for initiating Khalti payment"""
    booking_id = serializers.IntegerField()
    

class KhaltiVerifySerializer(serializers.Serializer):
    """Serializer for verifying Khalti payment"""
    pidx = serializers.CharField()
