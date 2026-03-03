from django.db import models
from bookings.models import Booking


class Payment(models.Model):
    """Payment record linked to a booking - tracks Khalti transaction status"""
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
    )

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="payment",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    khalti_token = models.CharField(max_length=255, blank=True, null=True)
    khalti_idx = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment #{self.id} - Booking #{self.booking.id} - {self.status}"
