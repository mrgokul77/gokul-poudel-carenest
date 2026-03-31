from rest_framework import serializers

from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = (
            "id",
            "title",
            "message",
            "target_audience",
            "is_active",
            "is_important",
            "created_at",
        )
        read_only_fields = ("id", "created_at")
