"""
Serializers for chat API responses.
"""
from rest_framework import serializers
from .models import Conversation, Message
from accounts.models import UserProfile
from backend.error_messages import ErrorMessages


class MessageSerializer(serializers.ModelSerializer):
    """Serialize a single message."""
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    sender_name = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender_id", "sender_name", "text", "created_at"]
        read_only_fields = ["id", "conversation", "sender", "created_at"]

    def validate_text(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError(ErrorMessages.CHAT_EMPTY_MESSAGE)
        return value


class ConversationListSerializer(serializers.ModelSerializer):
    """
    Serialize conversation for the list view.
    Adds other_user info and last message.
    """
    other_user_id = serializers.SerializerMethodField()
    other_user_name = serializers.SerializerMethodField()
    other_user_profile_image = serializers.SerializerMethodField()
    other_user_is_verified = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    last_message_time = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "other_user_id",
            "other_user_name",
            "other_user_profile_image",
            "other_user_is_verified",
            "last_message",
            "last_message_time",
        ]

    def _get_other_user(self, obj):
        """Get the other participant (requires request.user in context)."""
        request = self.context.get("request")
        if not request or not request.user:
            return None
        return obj.get_other_user(request.user)

    def get_other_user_id(self, obj):
        other = self._get_other_user(obj)
        return other.id if other else None

    def get_other_user_name(self, obj):
        other = self._get_other_user(obj)
        return other.username if other else ""

    def get_other_user_profile_image(self, obj):
        other = self._get_other_user(obj)
        if not other:
            return None
        try:
            profile = other.profile
            if profile and profile.profile_image:
                return profile.profile_image.name
        except Exception:
            pass
        return None

    def get_other_user_is_verified(self, obj):
        other = self._get_other_user(obj)
        if not other or other.role != "caregiver":
            return False
        try:
            return other.verification.verification_status == "approved"
        except Exception:
            return False

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        return last.text[:100] + "..." if last and len(last.text) > 100 else (last.text if last else "")

    def get_last_message_time(self, obj):
        last = obj.messages.order_by("-created_at").first()
        return last.created_at.isoformat() if last else None
