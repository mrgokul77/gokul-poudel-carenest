"""
WebSocket consumer for real-time chat.

When a user connects to ws://localhost:8000/ws/chat/<conversation_id>/:
1. Verify JWT from query string
2. Verify user is a participant in the conversation
3. Join room: conversation_<id>
4. On connect: mark user online, broadcast presence
5. On disconnect: mark user offline, broadcast presence
6. On message received: save to DB, broadcast to room
"""
import json
import logging

from django.utils import timezone
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken

logger = logging.getLogger(__name__)

from .models import Conversation, Message

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """Handles WebSocket connections for a single conversation."""

    async def connect(self):
        """
        Accept connection only if:
        - Valid JWT token in query string
        - User is a participant in this conversation
        """
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.room_name = f"conversation_{self.conversation_id}"

        # Get token from query string (e.g. ?token=xxx)
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

        # Verify user is in this conversation
        in_conversation = await self._user_in_conversation(user, self.conversation_id)
        if not in_conversation:
            await self.close(code=4003)
            return

        self.scope["user"] = user

        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept()

        # Mark user online and broadcast presence to room
        await self._update_presence(user.id, is_online=True)
        await self._broadcast_presence(user.id, is_online=True)

    async def disconnect(self, close_code):
        user = self.scope.get("user")
        if user:
            # Mark user offline and broadcast presence before leaving
            await self._update_presence(user.id, is_online=False)
            await self._broadcast_presence(user.id, is_online=False)
        await self.channel_layer.group_discard(self.room_name, self.channel_name)

    async def receive(self, text_data):
        """
        When a message is received:
        1. Parse JSON
        2. Save to database
        3. Broadcast to everyone in the room (including sender)
        """
        try:
            data = json.loads(text_data)
            text = (data.get("text") or "").strip()
        except (json.JSONDecodeError, TypeError):
            return

        if not text:
            return

        user = self.scope.get("user")
        if not user:
            return

        message = await self._save_message(text, user)
        if not message:
            return

        # Create notification for recipient and broadcast via notifications WebSocket
        await self._create_message_notification(message, user)

        # Broadcast to room (including sender)
        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "chat_message",
                "message": {
                    "id": message.id,
                    "sender_id": user.id,
                    "sender_name": user.username,
                    "text": message.text,
                    "created_at": message.created_at.isoformat(),
                },
            },
        )

    async def chat_message(self, event):
        """Send the message to the WebSocket."""
        await self.send(text_data=json.dumps(event["message"]))

    async def presence_update(self, event):
        """Send presence update to the WebSocket."""
        await self.send(text_data=json.dumps(event["payload"]))

    @database_sync_to_async
    def _update_presence(self, user_id, is_online):
        """Update user presence in database."""
        now = timezone.now()
        User.objects.filter(id=user_id).update(is_online=is_online, last_seen=now)

    async def _broadcast_presence(self, user_id, is_online):
        """Broadcast presence to all participants in the room."""
        last_seen = await self._get_user_last_seen(user_id)
        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "presence_update",
                "payload": {
                    "type": "presence",
                    "user_id": user_id,
                    "is_online": is_online,
                    "last_seen": last_seen,
                },
            },
        )

    @database_sync_to_async
    def _get_user_last_seen(self, user_id):
        """Get user's last_seen as ISO string."""
        try:
            user = User.objects.get(id=user_id)
            return user.last_seen.isoformat() if user.last_seen else None
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def _get_user_from_token(self, token_str):
        """Validate JWT and return User or None."""
        try:
            validated = UntypedToken(token_str)
            user_id = validated.get("user_id")
            if user_id is None:
                return None
            return User.objects.get(id=user_id)
        except (InvalidToken, TokenError, KeyError, User.DoesNotExist) as e:
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug("Chat WebSocket JWT validation failed: %s", e)
            return None
        except Exception as e:
            logger.warning("Chat WebSocket token validation error: %s", e)
            return None

    @database_sync_to_async
    def _user_in_conversation(self, user, conv_id):
        """Check if user is a participant in the conversation."""
        try:
            conv = Conversation.objects.get(id=conv_id)
            return user in (conv.user1, conv.user2)
        except Conversation.DoesNotExist:
            return False

    @database_sync_to_async
    def _save_message(self, text, sender):
        """Save message to DB and return it."""
        try:
            conv = Conversation.objects.get(id=self.conversation_id)
            msg = Message.objects.create(
                conversation=conv,
                sender=sender,
                text=text,
            )
            return msg
        except Conversation.DoesNotExist:
            return None

    @database_sync_to_async
    def _create_message_notification(self, message, sender):
        """Create notification for the message recipient."""
        from notifications.signals import create_message_notification
        conv = message.conversation
        recipient = conv.get_other_user(sender)
        preview = f"{sender.username}: {message.text}"
        create_message_notification(
            sender=sender,
            recipient=recipient,
            conversation_id=conv.id,
            preview_text=preview,
        )
