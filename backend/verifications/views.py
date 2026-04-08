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
from accounts.models import UserProfile, CaregiverProfile
import logging

logger = logging.getLogger(__name__)


def validate_caregiver_profile_completeness(user):
    # makes sure they filled out everything before they can upload docs
    # otherwise admins get incomplete info to verify
    missing_fields = []

    try:
        profile = user.profile
        phone = profile.phone.replace(' ', '').replace('-', '') if profile.phone else ''
        if len(phone) != 10 or not phone.isdigit():
            missing_fields.append("Phone (must be exactly 10 digits)")
        if not profile.address or not profile.address.strip():
            missing_fields.append("Address")
    except UserProfile.DoesNotExist:
        missing_fields.extend(["Phone", "Address"])

    try:
        caregiver = user.caregiver_profile
        if not caregiver.gender or not caregiver.gender.strip():
            missing_fields.append("Gender")
        if not caregiver.training_authority or not caregiver.training_authority.strip():
            missing_fields.append("Training Authority")
        if not caregiver.certification_year:
            missing_fields.append("Certification Year")
        if not caregiver.available_hours or not caregiver.available_hours.strip():
            missing_fields.append("Available Hours")
        if not caregiver.hourly_rate or caregiver.hourly_rate <= 0:
            missing_fields.append("Hourly Rate (must be greater than 0)")
        if not caregiver.service_types or len(caregiver.service_types) == 0:
            missing_fields.append("At least one Service Type")
    except CaregiverProfile.DoesNotExist:
        missing_fields.extend([
            "Gender", "Training Authority", "Certification Year",
            "Available Hours", "Hourly Rate", "Service Types"
        ])

    return len(missing_fields) == 0, missing_fields


class CaregiverDocumentUploadView(APIView):
    # caregivers upload their citizenship ID + training certificate for admin to verify
    permission_classes = [IsAuthenticated, IsCaregiver]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        # returns what we currently have on file for them
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
        # uploads docs for admin review
        is_valid, missing_fields = validate_caregiver_profile_completeness(request.user)
        if not is_valid:
            return Response(
                {
                    "error": "Complete profile before submitting verification documents.",
                    "missing_fields": missing_fields
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # can't re-verify if already approved
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
            with transaction.atomic():
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
