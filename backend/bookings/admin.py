from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ["id", "family", "caregiver", "date", "duration_hours", "status"]
    list_filter = ["status"]

