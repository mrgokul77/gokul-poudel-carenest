# REST API for chat: starting conversations and fetching old messages
# real-time updates come via WebSocket
from django.db import models
from django.db.models import Max
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message
from .serializers import ConversationListSerializer, MessageSerializer
from backend.error_messages import ErrorMessages


class ChatStartView(APIView):
    # careseekers can start chatting with caregivers - or get existing conv if one exists
    permission_classes = [IsAuthenticated]

    def post(self, request):
        caregiver_id = request.data.get("caregiver_id")
        if not caregiver_id:
            return Response(
                {"error": ErrorMessages.FIELD_REQUIRED},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        # Only careseekers can initiate conversations
        if user.role != "careseeker":
            return Response(
                {"error": ErrorMessages.UNAUTHORIZED},
                status=status.HTTP_403_FORBIDDEN,
            )

        from accounts.models import User
        try:
            caregiver = User.objects.get(id=caregiver_id, role="caregiver")
        except User.DoesNotExist:
            return Response(
                {"error": ErrorMessages.UNAUTHORIZED},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Normalize order: user1_id < user2_id so we don't create duplicates
        u1, u2 = (user, caregiver) if user.id < caregiver.id else (caregiver, user)

        conversation, created = Conversation.objects.get_or_create(
            user1=u1,
            user2=u2,
        )

        return Response(
            {"conversation_id": conversation.id},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ConversationListView(APIView):
    """
    List all conversations for the logged-in user.

    GET /api/chat/conversations/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = Conversation.objects.filter(
            models.Q(user1=user) | models.Q(user2=user)
        ).annotate(
            last_msg_at=Max("messages__created_at")
        ).order_by("-last_msg_at", "-created_at")

        serializer = ConversationListSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)


class MessageListView(APIView):
    """
    Fetch messages for a conversation.

    GET /api/chat/messages/<conversation_id>/

    User must be a participant in the conversation.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        user = request.user
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user not in (conv.user1, conv.user2):
            return Response(
                {"error": ErrorMessages.UNAUTHORIZED},
                status=status.HTTP_403_FORBIDDEN,
            )

        messages = conv.messages.all().order_by("created_at")
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
