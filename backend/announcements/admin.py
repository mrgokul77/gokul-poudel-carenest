from django.contrib import admin

from .models import Announcement


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "target_audience", "is_active", "is_important", "created_at")
    list_filter = ("target_audience", "is_active", "is_important")
    search_fields = ("title", "message")
