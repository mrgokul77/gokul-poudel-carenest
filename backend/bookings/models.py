from django.db import models
from django.conf import settings


class Booking(models.Model):
    """Booking request from family to caregiver - tracks status workflow"""
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    )

    family = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings_made",
    )
    caregiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings_received",
    )
    service_types = models.JSONField(default=list, blank=True)  # array of selected services
    person_name = models.CharField(max_length=255, blank=True)  # relationship to person needing care
    person_age = models.PositiveIntegerField(null=True, blank=True)
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    duration_hours = models.PositiveIntegerField()
    emergency_contact_name = models.CharField(max_length=255, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    additional_info = models.TextField(blank=True)
    notes = models.TextField(blank=True)  # kept for backwards compatibility
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="pending",  # new bookings start as pending
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.family.username} -> {self.caregiver.username} ({self.date})"
