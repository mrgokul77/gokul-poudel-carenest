"""
WebSocket consumer for real-time notifications.
Users connect to ws://host/ws/notifications/?token=<jwt>
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
import logging

from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken

logger = logging.getLogger(__name__)

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """Handles WebSocket connections for user notifications."""

    async def connect(self):
        query_string = self.scope.get("query_string", b"").decode()
        token = None
        for part in query_string.split("&"):
            if part.startswith("token="):
                token = part[6:].strip()
                break

        if not token:
            await self.close(code=4001)
            return

        user = await self._get_user_from_token(token)
        if not user:
            await self.close(code=4001)
            return

        self.user_id = user.id
        self.room_name = f"notifications_user_{user.id}"

        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_name"):
            await self.channel_layer.group_discard(self.room_name, self.channel_name)

    async def notification_new(self, event):
        """Send new notification to the WebSocket."""
        await self.send(text_data=json.dumps(event["notification"]))

    @database_sync_to_async
    def _get_user_from_token(self, token_str):
        try:
            validated = UntypedToken(token_str)
            user_id = validated.get("user_id")
            if user_id is None:
                return None
            return User.objects.get(id=user_id)
        except (InvalidToken, TokenError, KeyError, User.DoesNotExist) as e:
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug("Notification WebSocket JWT validation failed: %s", e)
            return None
        except Exception as e:
            logger.warning("Notification WebSocket token validation error: %s", e)
            return None
