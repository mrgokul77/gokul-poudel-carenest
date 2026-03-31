from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta


class Booking(models.Model):
    """Booking request from family to caregiver - tracks status workflow"""
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("completion_requested", "Completion Requested"),
        ("completed", "Completed"),
        ("rejected", "Declined"),
        ("expired", "Expired"),
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
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    additional_info = models.TextField(blank=True)
    status = models.CharField(
        max_length=25,
        choices=STATUS_CHOICES,
        default="pending",  # new bookings start as pending
    )  # No cancelled status
    created_at = models.DateTimeField(auto_now_add=True)
    service_address = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.family.username} -> {self.caregiver.username} ({self.date})"

    @property
    def start_datetime(self):
        """
        Returns timezone-aware start datetime by combining date and start_time.
        If start_time is missing, defaults to midnight (00:00).
        Uses Asia/Kathmandu local time.
        """
        time_part = self.start_time if self.start_time else datetime.min.time()
        naive_dt = datetime.combine(self.date, time_part)
        # Always localize to Asia/Kathmandu
        kathmandu_tz = timezone.get_fixed_timezone(345)  # 5*60+45=345
        return timezone.make_aware(naive_dt, kathmandu_tz)

    @property
    def end_datetime(self):
        """
        Returns timezone-aware end datetime calculated as:
        start_datetime + duration_hours
        
        This is used to determine when a caregiver becomes available again.
        """
        return self.start_datetime + timedelta(hours=self.duration_hours)

    @property
    def is_ongoing_or_future(self):
        """
        Returns True if this booking's end time is still in the future.
        Used to check if a caregiver is currently unavailable due to this booking.
        """
        return self.end_datetime > timezone.localtime()

    def overlaps_with(self, other_date, other_start_time, other_duration_hours):
        """
        Check if this booking overlaps with a proposed time slot.
        
        Two time slots overlap if one starts before the other ends AND
        the other starts before this one ends. Classic interval overlap logic.
        
        Args:
            other_date: The date of the proposed booking
            other_start_time: The start time of the proposed booking
            other_duration_hours: Duration in hours of the proposed booking
            
        Returns:
            True if there's an overlap, False otherwise
        """
        # Build the proposed booking's start and end datetimes
        other_time = other_start_time if other_start_time else datetime.min.time()
        other_start_naive = datetime.combine(other_date, other_time)
        other_start = timezone.make_aware(other_start_naive, timezone.get_current_timezone())
        other_end = other_start + timedelta(hours=other_duration_hours)
        
        # Two intervals [A_start, A_end] and [B_start, B_end] overlap if:
        # A_start < B_end AND B_start < A_end
        return self.start_datetime < other_end and other_start < self.end_datetime
