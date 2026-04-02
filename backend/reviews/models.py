from django.db import models
from django.conf import settings

from bookings.models import Booking


class Review(models.Model):
    # after a booking is done, the careseeker can rate the caregiver
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="review",
    )
    caregiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="caregiver_reviews",
    )
    careseeker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="careseeker_reviews",
    )
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review {self.rating}★ for booking {self.booking_id}"
