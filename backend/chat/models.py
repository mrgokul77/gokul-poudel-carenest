"""
Chat models for user-to-user messaging.

Conversation: Links two users (careseeker and caregiver).
Message: Individual messages within a conversation.

Rule: Only ONE conversation exists between any two users.
"""
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    # a 1-on-1 chat between two people (only one per pair)
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_conversations_as_user1",
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_conversations_as_user2",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        # Ensure only one conversation per pair (order of user1/user2 normalized)
        constraints = [
            models.UniqueConstraint(
                fields=["user1", "user2"],
                name="unique_conversation_pair",
            )
        ]

    def __str__(self):
        return f"Conversation {self.id} ({self.user1.username} - {self.user2.username})"

    def get_other_user(self, user):
        """Return the other participant in the conversation."""
        return self.user2 if user == self.user1 else self.user1


class Message(models.Model):
    # individual messages in a conversation
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message {self.id} from {self.sender.username}"
