"""
Notification API: list, mark single read, mark all read.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """GET /api/user/notifications/ - List notifications for the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Notification.objects.filter(user=request.user)
            .order_by("-created_at")
            .distinct()
        )
        # Optional filter by type
        ntype = request.query_params.get("type", "").strip().lower()
        if ntype in ("booking", "payment", "message"):
            qs = qs.filter(type=ntype)
        serializer = NotificationSerializer(qs, many=True)
        return Response({"notifications": serializer.data})


class NotificationMarkReadView(APIView):
    """PATCH /api/user/notifications/<id>/read/ - Mark a single notification as read."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    """POST /api/user/notifications/mark-all-read/ - Mark all notifications as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True
        )
        return Response({"marked": updated})


class NotificationUnreadCountView(APIView):
    """GET /api/user/notifications/unread-count/ - Get unread notification count."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count})
