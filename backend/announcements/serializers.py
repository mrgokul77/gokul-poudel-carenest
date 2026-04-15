from rest_framework import serializers

from .models import Announcement
from backend.error_messages import ErrorMessages


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

    def validate_title(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError(ErrorMessages.ANNOUNCEMENT_TITLE_REQUIRED)
        return value

    def validate_message(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError(ErrorMessages.ANNOUNCEMENT_MESSAGE_REQUIRED)
        return value
