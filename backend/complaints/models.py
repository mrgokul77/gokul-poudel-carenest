from django.db import models
from django.conf import settings


class Complaint(models.Model):
    STATUS_CHOICES = (
        ("open", "Open"),
        ("investigating", "Investigating"),
        ("resolved", "Resolved"),
    )

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="complaints_filed",
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="complaints_against",
        null=True,
        blank=True,
    )
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints",
    )
    category = models.CharField(max_length=100, default="Other")
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="open",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Complaint by {self.reporter} - {self.category}"
