from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import Complaint
from .serializers import ComplaintSerializer
from backend.error_messages import ErrorMessages


class FileComplaintView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.data:
            return Response(
                {"error": ErrorMessages.COMPLAINT_REQUIRED_FIELDS},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking_id = request.data.get("booking_id")

        already_exists = Complaint.objects.filter(
            reporter=request.user,
            booking_id=booking_id,
            status__in=("open", "investigating")
        ).exists()

        if already_exists:
            return Response(
                {"error": "You already have an active complaint for this booking."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ComplaintSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(reporter=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        if isinstance(serializer.errors, dict):
            if "category" in serializer.errors:
                return Response({"error": ErrorMessages.COMPLAINT_CATEGORY_REQUIRED}, status=status.HTTP_400_BAD_REQUEST)
            if "description" in serializer.errors:
                return Response({"error": ErrorMessages.COMPLAINT_DESCRIPTION_REQUIRED}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": ErrorMessages.COMPLAINT_REQUIRED_FIELDS}, status=status.HTTP_400_BAD_REQUEST)


class UserComplaintListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        booking_id = request.query_params.get("booking_id")
        complaints = Complaint.objects.filter(reporter=request.user).select_related(
            "booking", "booking__caregiver"
        )
        
        if booking_id:
            complaints = complaints.filter(booking_id=booking_id)
            
        data = []
        for c in complaints:
            data.append({
                "id": c.id,
                "booking_id": c.booking_id,
                "booking_date": c.booking.date if c.booking else None,
                "caregiver_name": c.booking.caregiver.username if c.booking and c.booking.caregiver else "N/A",
                "category": c.category,
                "description": c.description,
                "status": c.status,
                "created_at": c.created_at,
            })
        return Response(data, status=status.HTTP_200_OK)


class AdminComplaintListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get("status")
        complaints = Complaint.objects.select_related("reporter", "booking", "booking__caregiver").all()

        if status_filter:
            complaints = complaints.filter(status=status_filter)

        data = []
        for c in complaints:
            data.append({
                "id": c.id,
                "reporter_username": c.reporter.username,
                "caregiver_name": c.booking.caregiver.username if c.booking and c.booking.caregiver else "N/A",
                "booking_id": c.booking.id if c.booking else None,
                "category": c.category,
                "description": c.description,
                "status": c.status,
                "created_at": c.created_at,
            })
        return Response(data, status=status.HTTP_200_OK)


class AdminComplaintDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, pk):
        try:
            c = Complaint.objects.select_related("reporter", "booking", "booking__caregiver").get(pk=pk)
            return Response({
                "id": c.id,
                "reporter_username": c.reporter.username,
                "caregiver_name": c.booking.caregiver.username if c.booking and c.booking.caregiver else "N/A",
                "booking_id": c.booking.id if c.booking else None,
                "category": c.category,
                "description": c.description,
                "status": c.status,
                "created_at": c.created_at,
                "updated_at": c.updated_at,
            }, status=status.HTTP_200_OK)
        except Complaint.DoesNotExist:
            return Response({"error": "Complaint not found"}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        try:
            c = Complaint.objects.get(pk=pk)
            new_status = request.data.get("status")
            if new_status not in ("open", "investigating", "resolved", "dismissed"):
                return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
            
            c.status = new_status
            c.save()
            return Response({"id": c.id, "status": c.status}, status=status.HTTP_200_OK)
        except Complaint.DoesNotExist:
            return Response({"error": "Complaint not found"}, status=status.HTTP_404_NOT_FOUND)
