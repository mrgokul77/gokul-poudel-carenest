"""
Django signals to auto-create notifications on booking, payment, and message events.
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification
from .utils import send_push_notification
from bookings.models import Booking
from payments.models import Payment


def send_mobile_push(user, title, body, data={}):
    try:
        from notifications.models import PushToken
        tokens = PushToken.objects.filter(user=user)
        for token_obj in tokens:
            try:
                send_push_notification(
                    token_obj.push_token,
                    title,
                    body,
                    data,
                )
            except Exception:
                pass
    except Exception:
        pass


def _get_user_push_token(user):
    """Resolve the most recent saved push token for a user."""
    if not user:
        return None

    record = getattr(user, "push_token_record", None)
    if record and record.token:
        return record.token

    token = getattr(user, "push_token", None)
    return token or None


def _broadcast_notification_to_user(user_id, notification_data):
    """Send notification payload to user's notification WebSocket channel."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"notifications_user_{user_id}",
            {"type": "notification_new", "notification": notification_data},
        )


@receiver(pre_save, sender=Booking)
def _store_previous_booking_status(instance, **kwargs):
    """Store previous status before save for delta detection."""
    if instance.pk:
        try:
            old = Booking.objects.get(pk=instance.pk)
            instance._previous_status = old.status
        except Booking.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


def _create_and_broadcast(user, ntype, title, message, related_id):
    """Create notification and broadcast via WebSocket."""
    n = Notification.objects.create(
        user=user,
        type=ntype,
        title=title,
        message=message,
        related_id=related_id,
    )
    from .serializers import NotificationSerializer
    _broadcast_notification_to_user(user.id, NotificationSerializer(n).data)

    push_token = _get_user_push_token(user)
    if push_token:
        send_push_notification(
            token=push_token,
            title=title,
            body=message,
            data={"type": ntype, "related_id": related_id},
        )


@receiver(post_save, sender=Booking)
def on_booking_change(instance, created, **kwargs):
    """Create notifications when booking status changes."""
    if created:
        # New booking request -> notify caregiver
        _create_and_broadcast(
            instance.caregiver,
            "booking",
            "New booking request",
            f"{instance.family.username} sent you a booking request.",
            instance.id,
        )
        return

    old_status = getattr(instance, "_previous_status", None)
    if old_status == instance.status:
        return

    if instance.status == "accepted":
        _create_and_broadcast(
            instance.family,
            "booking",
            "Booking accepted",
            "Caregiver accepted your booking",
            instance.id,
        )
    elif instance.status == "rejected":
        _create_and_broadcast(
            instance.family,
            "booking",
            "Booking declined",
            "Caregiver rejected your booking",
            instance.id,
        )
    elif instance.status == "in_progress":
        _create_and_broadcast(
            instance.family,
            "booking",
            "Service started",
            f"Caregiver {instance.caregiver.username} checked in for your booking.",
            instance.id,
        )
    elif instance.status == "completion_requested":
        _create_and_broadcast(
            instance.family,
            "booking",
            "Service completion requested",
            f"Caregiver {instance.caregiver.username} has requested completion confirmation.",
            instance.id,
        )
    elif instance.status == "completed":
        _create_and_broadcast(
            instance.family,
            "booking",
            "Booking completed",
            f"Caregiver {instance.caregiver.username} completed your booking.",
            instance.id,
        )
        _create_and_broadcast(
            instance.caregiver,
            "booking",
            "Booking completed",
            f"Booking with {instance.family.username} has been marked complete.",
            instance.id,
        )
    elif instance.status == "expired":
        _create_and_broadcast(
            instance.family,
            "booking",
            "Booking expired",
            "Your booking request has expired.",
            instance.id,
        )
        _create_and_broadcast(
            instance.caregiver,
            "booking",
            "Booking expired",
            "A booking request has expired.",
            instance.id,
        )


@receiver(post_save, sender=Booking)
def on_booking_mobile_push(instance, created, **kwargs):
    try:
        booking = instance
        booking_data = {"booking_id": booking.id}

        if created or getattr(booking, "_previous_status", None) == booking.status:
            return

        if booking.status == 'pending':
            send_mobile_push(
                booking.caregiver,
                "New Booking Request 📋",
                f"New booking request for {booking.date}",
                booking_data,
            )
        elif booking.status == 'accepted':
            send_mobile_push(
                booking.family,
                "Booking Accepted ✓",
                "Your caregiver accepted your booking",
                booking_data,
            )
        elif booking.status == 'rejected':
            send_mobile_push(
                booking.family,
                "Booking Rejected",
                "Your booking was rejected",
                booking_data,
            )
        elif booking.status == 'in_progress':
            send_mobile_push(
                booking.family,
                "🏃 Caregiver Has Arrived!",
                "Your caregiver has checked in",
                booking_data,
            )
        elif booking.status == 'completed':
            send_mobile_push(
                booking.family,
                "✓ Service Completed",
                "Please rate your caregiver",
                booking_data,
            )
    except Exception:
        pass


def _display_username(user):
    """Short label for notifications (User has no first/last name)."""
    if user is None:
        return None
    return user.username


def _caregiver_display_name(booking, payment):
    u = booking.caregiver if booking else None
    if u is None and payment is not None:
        u = payment.caregiver
    return _display_username(u)


def _family_display_name(booking, payment):
    u = booking.family if booking else None
    if u is None and payment is not None:
        u = payment.careseeker
    return _display_username(u)


@receiver(post_save, sender=Payment)
def on_payment_change(instance, created, update_fields, **kwargs):
    """Create notifications when payment status changes to completed/failed."""
    booking = getattr(instance, "booking", None)
    caregiver_name = _caregiver_display_name(booking, instance)
    family_name = _family_display_name(booking, instance)
    amount_str = str(instance.amount)

    if instance.status == "completed":
        if booking and booking.family:
            payee = caregiver_name or "your caregiver"
            _create_and_broadcast(
                booking.family,
                "payment",
                f"Paid {payee}",
                (
                    f"You paid Rs.{amount_str} to {payee} for your booking. "
                    f"They have received your payment."
                ),
                instance.id,
            )
    elif instance.status == "failed":
        if booking and booking.family:
            payee = caregiver_name or "your caregiver"
            _create_and_broadcast(
                booking.family,
                "payment",
                "Payment failed",
                (
                    f"Your payment to {payee} could not be processed. "
                    f"Please try again when you are ready."
                ),
                instance.id,
            )


@receiver(post_save)
def on_emergency_mobile_push(sender, instance, created, **kwargs):
    try:
        from accounts.models import Emergency
        if sender is not Emergency or not created:
            return

        emergency = instance

        def send_emergency_push(user, title, body, data):
            tokens = []
            try:
                from notifications.models import PushToken
                tokens = PushToken.objects.filter(user=user)
            except Exception:
                tokens = []

            for token_obj in tokens:
                try:
                    send_push_notification(token_obj.push_token, title, body, data)
                except Exception:
                    pass

        emergency_data = {"emergency_id": emergency.id, "booking_id": emergency.booking_id}

        admins = []
        try:
            from accounts.models import User
            admins = User.objects.filter(role='admin')
        except Exception:
            admins = []

        for admin in admins:
            send_emergency_push(
                admin,
                "🚨 EMERGENCY ALERT",
                f"Emergency for booking #{emergency.booking_id}",
                emergency_data,
            )

        if emergency.booking and emergency.booking.caregiver:
            send_emergency_push(
                emergency.booking.caregiver,
                "⚠ Emergency - Action Required",
                "Your careseeker needs immediate help",
                emergency_data,
            )
    except Exception:
        pass


def create_message_notification(sender, recipient, conversation_id, preview_text):
    """
    Create or update notification when a new chat message is received.
    Groups message notifications by conversation - only one per sender.
    Updates existing unread notification with latest preview and message count.
    """
    from .serializers import NotificationSerializer

    sender_name = sender.username
    msg = preview_text[:200] + ("..." if len(preview_text) > 200 else "")

    existing = Notification.objects.filter(
        user=recipient,
        type="message",
        related_id=conversation_id,
        is_read=False,
    ).first()

    if existing:
        # Delete any other unread message notifications for this conversation (dedup)
        Notification.objects.filter(
            user=recipient,
            type="message",
            related_id=conversation_id,
            is_read=False,
        ).exclude(pk=existing.pk).delete()
        existing.title = sender_name
        existing.message = msg
        existing.message_count = (existing.message_count or 1) + 1
        existing.created_at = timezone.now()
        existing.save(update_fields=["title", "message", "message_count", "created_at"])
        _broadcast_notification_to_user(
            recipient.id,
            NotificationSerializer(existing).data,
        )
    else:
        n = Notification.objects.create(
            user=recipient,
            type="message",
            title=sender_name,
            message=msg,
            related_id=conversation_id,
            message_count=1,
        )
        _broadcast_notification_to_user(
            recipient.id,
            NotificationSerializer(n).data,
        )
