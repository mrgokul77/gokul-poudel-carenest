from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "booking", "caregiver", "careseeker", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("booking__id", "caregiver__email", "careseeker__email")

