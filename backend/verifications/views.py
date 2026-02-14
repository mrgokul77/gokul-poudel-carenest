from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils.timezone import now
from django.db import transaction

from .models import CaregiverVerification
from .serializers import (
    CaregiverVerificationSerializer, 
    AdminCaregiverVerificationSerializer,
)
from .permissions import IsCaregiver
from .utils import Util
import logging

logger = logging.getLogger(__name__)


class CaregiverDocumentUploadView(APIView):
    """Caregivers upload citizenship docs + certificate for verification"""
    permission_classes = [IsAuthenticated, IsCaregiver]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        """Check current verification status"""
        try:
            verification = CaregiverVerification.objects.get(user=request.user)
            serializer = CaregiverVerificationSerializer(verification, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except CaregiverVerification.DoesNotExist:
            return Response(
                {"message": "No documents uploaded yet", "can_upload": True},
                status=status.HTTP_200_OK
            )

    def post(self, request):
        """Upload all verification documents at once"""
        # Check if already verified
        try:
            existing = CaregiverVerification.objects.get(user=request.user)
            if existing.verification_status == 'approved':
                return Response(
                    {"error": "Your account is already verified"},
                    status=status.HTTP_409_CONFLICT
                )
            if existing.verification_status == 'pending':
                return Response(
                    {"error": "You have a pending verification request"},
                    status=status.HTTP_409_CONFLICT
                )
            # If rejected, allow re-upload by deleting old record
            if existing.verification_status == 'rejected':
                existing.delete()
        except CaregiverVerification.DoesNotExist:
            pass

        # Validate required fields
        required_fields = ['citizenship_front', 'citizenship_back', 'certificate']
        missing = [f for f in required_fields if not request.data.get(f)]
        if missing:
            return Response(
                {"error": f"Missing required documents: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CaregiverVerificationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            verification = serializer.save(user=request.user, verification_status='pending')
            logger.info(f"Documents uploaded for user {request.user.email}")
            return Response(
                {
                    "message": "Documents uploaded successfully",
                    "data": CaregiverVerificationSerializer(verification, context={'request': request}).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminCaregiverListView(APIView):
    """Admin views all verification requests"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """Filter by status or get all"""
        show_all = request.query_params.get('all', 'false').lower() == 'true'
        
        if show_all:
            verifications = CaregiverVerification.objects.all().order_by('-uploaded_at')
        else:
            filter_status = request.query_params.get('status', 'pending')
            verifications = CaregiverVerification.objects.filter(
                verification_status=filter_status
            ).order_by('uploaded_at')
        
        serializer = AdminCaregiverVerificationSerializer(
            verifications, many=True, context={'request': request}
        )
        return Response({
            "count": verifications.count(),
            "results": serializer.data
        }, status=status.HTTP_200_OK)


class AdminVerifyCaregiverView(APIView):
    """Admin approves or rejects caregiver - sends email notification"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def put(self, request, pk):
        """Update verification status"""
        try:
            verification = CaregiverVerification.objects.select_for_update().get(pk=pk)
        except CaregiverVerification.DoesNotExist:
            return Response(
                {"error": "Verification request not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get('verification_status')
        if new_status not in ['approved', 'rejected']:
            return Response(
                {"error": "Status must be 'approved' or 'rejected'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if verification.verification_status != 'pending':
            return Response(
                {"error": f"This verification has already been {verification.verification_status}"},
                status=status.HTTP_409_CONFLICT
            )

        rejection_reason = request.data.get('rejection_reason', '').strip()
        if new_status == 'rejected' and not rejection_reason:
            return Response(
                {"error": "Rejection reason is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                verification.verification_status = new_status
                verification.verified_by = request.user
                
                if new_status == 'approved':
                    verification.verified_at = now()
                    verification.rejection_reason = None
                else:
                    verification.rejection_reason = rejection_reason
                    verification.verified_at = None
                
                verification.save()
                logger.info(f"Verification {new_status} for {verification.user.email} by {request.user.email}")
            
            Util.send_verification_email_async(
                user_email=verification.user.email,
                username=verification.user.username,
                status=new_status,
                rejection_reason=rejection_reason if new_status == 'rejected' else None
            )

            serializer = AdminCaregiverVerificationSerializer(verification, context={'request': request})
            return Response(
                {"message": f"Verification {new_status} successfully", "data": serializer.data},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error updating verification {pk}: {str(e)}")
            return Response(
                {"error": "Update failed", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
