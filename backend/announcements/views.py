from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Announcement
from .serializers import AnnouncementSerializer


def _visible_for_user(qs, user):
    # admins see everything, regular users see based on their role
    if user.is_staff or getattr(user, "role", None) == "admin":
        return qs
    qs = qs.filter(is_active=True)
    role = getattr(user, "role", None)
    if role == "caregiver":
        return qs.filter(
            Q(target_audience=Announcement.TargetAudience.ALL)
            | Q(target_audience=Announcement.TargetAudience.CAREGIVERS)
        )
    if role == "careseeker":
        return qs.filter(
            Q(target_audience=Announcement.TargetAudience.ALL)
            | Q(target_audience=Announcement.TargetAudience.CARESEEKERS)
        )
    return qs.none()


class AnnouncementListView(APIView):
    # shows announcements based on user role - need to see if they're an admin or regular user
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _visible_for_user(Announcement.objects.all(), request.user)
        serializer = AnnouncementSerializer(qs, many=True)
        return Response({"announcements": serializer.data})


class AdminAnnouncementListCreateView(APIView):
    # admin-only: can posting announcements that target caregivers/careseekers/everyone
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        # admin sees all announcements
        qs = Announcement.objects.all().order_by("-created_at")
        serializer = AnnouncementSerializer(qs, many=True)
        return Response({"announcements": serializer.data})

    def post(self, request):
        serializer = AnnouncementSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
