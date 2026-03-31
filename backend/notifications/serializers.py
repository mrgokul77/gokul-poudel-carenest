from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "message",
            "is_read",
            "related_id",
            "message_count",
            "created_at",
        ]
        read_only_fields = fields
