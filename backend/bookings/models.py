from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta


class Booking(models.Model):
    # the whole lifecycle of a caregiver+family pairing for one service
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
    service_types = models.JSONField(default=list, blank=True)  # things he/she was hired to do
    person_name = models.CharField(max_length=255, blank=True)  # who needs care
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
        default="pending",  # always starts as waiting for caregiver response
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
        # combines date + time into one datetime. defaults to midnight if time is empty
        # using Nepal timezone (GMT+5:45) since that's where CareNest is deployed
        time_part = self.start_time if self.start_time else datetime.min.time()
        naive_dt = datetime.combine(self.date, time_part)
        kathmandu_tz = timezone.get_fixed_timezone(345)  # 5*60+45=345
        return timezone.make_aware(naive_dt, kathmandu_tz)

    @property
    def end_datetime(self):
        # figuring out when the caregiver should be free again
        return self.start_datetime + timedelta(hours=self.duration_hours)

    @property
    def is_ongoing_or_future(self):
        # checks if this booking is still happening (not already done)
        return self.end_datetime > timezone.localtime()

    def overlaps_with(self, other_date, other_start_time, other_duration_hours):
        # checks if two bookings conflict with each other
        # basic interval overlap: if one starts before the other ends AND vice versa
        other_time = other_start_time if other_start_time else datetime.min.time()
        other_start_naive = datetime.combine(other_date, other_time)
        other_start = timezone.make_aware(other_start_naive, timezone.get_current_timezone())
        other_end = other_start + timedelta(hours=other_duration_hours)
        
        return self.start_datetime < other_end and other_start < self.end_datetime
