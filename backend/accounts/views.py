from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateAPIView
from accounts.serializers import *
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from .models import *
from verifications.models import CaregiverVerification


def get_tokens_for_user(user):
    """Generate JWT tokens manually for login response"""
    refresh = RefreshToken.for_user(user)

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class UserRegistrationView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user=serializer.save()
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            return Response(
                {"message": "Email verified successfully"},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class UserLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)

        if serializer.is_valid(raise_exception=True):
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            authenticated_user = authenticate(
                request,
                username=email,
                password=password
            )

            if authenticated_user is not None:
                # Block unverified users (admins bypass this)
                if not authenticated_user.is_admin and not authenticated_user.is_verified:
                    return Response(
                        {"error": "Email not verified. Please verify OTP."},
                        status=status.HTTP_403_FORBIDDEN
                    )

                token = get_tokens_for_user(authenticated_user)

                # Return token + user info for frontend to store
                return Response(
                    {
                        "token": token,
                        "role": authenticated_user.role,
                        "email": authenticated_user.email,
                        "user_id": authenticated_user.id,
                        "message": "Login Successful"
                    },
                    status=status.HTTP_200_OK
                )

            return Response(
                {"error": "Email or password is incorrect"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    
class UserProfileView(APIView):
    """Get/update current user's profile - handles both common and caregiver data"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        # Get or create common profile
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=request.user)
            
        serializer = UserProfileSerializer(
    profile,
    context={"request": request}
)

        data = serializer.data

        # Caregivers get extra fields + verification status
        if request.user.role == 'caregiver':
            try:
                caregiver_profile = request.user.caregiver_profile
            except CaregiverProfile.DoesNotExist:
                caregiver_profile = CaregiverProfile.objects.create(user=request.user)
                
            caregiver_serializer = CaregiverProfileSerializer(caregiver_profile)
            data['caregiver_details'] = caregiver_serializer.data
            
            # Include verification status so frontend can show badges
            try:
                verification = request.user.verification
                data['verification_status'] = verification.verification_status
            except CaregiverVerification.DoesNotExist:
                data['verification_status'] = None

        return Response(data, status=200)

    def patch(self, request):
        """Update common profile fields (phone, address, image)"""
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=request.user)

        serializer = UserProfileSerializer(
    profile,
    data=request.data,
    partial=True,
    context={"request": request}
)

        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Profile updated successfully", "data": serializer.data},
                status=200
            )
        return Response(serializer.errors, status=400)

    def put(self, request):
        # PUT works same as PATCH for convenience
        return self.patch(request)


class CaregiverProfileView(APIView):
    """Update caregiver-specific fields - services, bio, credentials"""
    def get_object(self, request):
        if request.user.role != 'caregiver':
            return None
        try:
            return request.user.caregiver_profile
        except CaregiverProfile.DoesNotExist:
            return CaregiverProfile.objects.create(user=request.user)

    def patch(self, request):
        """Update caregiver-specific profile fields"""
        profile = self.get_object(request)
        if not profile:
            return Response({"error": "Only caregivers can update this profile"}, status=403)

        serializer = CaregiverProfileSerializer(
    profile,
    data=request.data,
    partial=True,
    context={"request": request}
)

        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Caregiver details updated successfully", "data": serializer.data},
                status=200
            )
        return Response(serializer.errors, status=400)


class AdminUserProfileView(APIView):
    """Admin-only read access to any user's profile"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Same response shape as UserProfileView for consistency
        try:
            profile = target_user.profile
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=target_user)
        serializer = UserProfileSerializer(profile, context={"request": request})
        data = serializer.data
        
        if target_user.role == "caregiver":
            try:
                caregiver_profile = target_user.caregiver_profile
            except CaregiverProfile.DoesNotExist:
                caregiver_profile = CaregiverProfile.objects.create(user=target_user)
            caregiver_serializer = CaregiverProfileSerializer(caregiver_profile)
            data["caregiver_details"] = caregiver_serializer.data
            try:
                verification = target_user.verification
                data["verification_status"] = verification.verification_status
            except CaregiverVerification.DoesNotExist:
                data["verification_status"] = None
        return Response(data, status=200)


class UserChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = UserChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['password'])
        request.user.save()

        return Response(
            {"message": "Password changed successfully"},
            status=status.HTTP_200_OK
        )

class SendPasswordResetEmailView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = SendPasswordResetEmailSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            return Response(
                {"message": f"Password reset successfully sent to email"},
                status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class UserPasswordResetView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, uid, token):
        serializer = UserPasswordResetSerializer(data=request.data, context={'uid': uid, 'token': token})
        if serializer.is_valid(raise_exception=True):
            return Response(
                {"message": "Password reset successfully"},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)