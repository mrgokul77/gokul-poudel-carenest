"""
Notification model for user notifications (booking, payment, message events).
"""
from django.db import models
from django.conf import settings


class Notification(models.Model):
    """User notification with type, content, and related entity for redirection."""

    TYPE_CHOICES = [
        ("booking", "Booking"),
        ("payment", "Payment"),
        ("message", "Message"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, db_index=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    related_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID of related booking, payment, or conversation",
    )
    message_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        default=1,
        help_text="For message type: number of unread messages from this sender",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.type} - {self.title}"
