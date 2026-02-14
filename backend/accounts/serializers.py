from rest_framework import serializers
from accounts.models import *
from django.utils.encoding import smart_str, force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from accounts.utils import util
import random
from django.utils.timezone import now
from datetime import timedelta
import json

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Handles signup - generates OTP and sends verification email"""
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'role']
        extra_kwargs = {
            'password': {'write_only': True}
        }
        
    def validate(self, attrs):
        # Generate OTP during validation so it's ready for create()
        self.otp = random.randint(100000, 999999)
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)

        # Store OTP for verification
        user.otp = self.otp
        user.otp_created_at = now()
        user.is_verified = False
        user.save()

        # Auto-create profiles so they exist when user logs in
        UserProfile.objects.create(user=user)
        if user.role == 'caregiver':
            CaregiverProfile.objects.create(user=user)

        # Send OTP email
        body = f"Your CareNest OTP is {self.otp}. It is valid for 10 minutes."
        data = {
            'subject': 'Verify your CareNest account',
            'body': body,
            'to_email': user.email
        }

        util.send_email(data)
        return user

class VerifyOTPSerializer(serializers.Serializer):
    """Validates OTP and marks user as verified"""
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

    def validate(self, attrs):
        email = attrs.get('email')
        otp = attrs.get('otp')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email")

        if user.is_verified:
            raise serializers.ValidationError("Account already verified")

        if str(user.otp) != str(otp):
            raise serializers.ValidationError("Invalid OTP")

        # OTP expires after 10 minutes
        if now() > user.otp_created_at + timedelta(minutes=10):
            raise serializers.ValidationError("OTP has expired")

        # Mark verified and clear OTP
        user.is_verified = True
        user.otp = None
        user.save()

        # Safety check - create profiles if missing (shouldn't happen normally)
        if not hasattr(user, 'profile'):
            UserProfile.objects.create(user=user)
        if user.role == 'caregiver' and not hasattr(user, 'caregiver_profile'):
            CaregiverProfile.objects.create(user=user)

        return attrs

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class CaregiverProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaregiverProfile
        fields = [
            "service_types",
            "training_authority",
            "certification_year",
            "available_hours",
            "bio",
            "gender"
        ]

class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    profile_image = serializers.ImageField(required=False)

    class Meta:
        model = UserProfile
        fields = [
            "email",
            "username",
            "role",
            "phone",
            "address",
            "profile_image",
        ]

class UserChangePasswordSerializer(serializers.Serializer):
    password = serializers.CharField(max_length=128, write_only=True)

    class Meta:
        fields = ['password']

    def validate_password(self, data):
        return data

class SendPasswordResetEmailSerializer(serializers.Serializer):
    """Generates reset token and emails link to user"""
    email = serializers.EmailField(max_length=255)

    class Meta:
        fields = ['email']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():   
            user = User.objects.get(email=value)
            
            # Build reset link with encoded user ID and token
            uid = urlsafe_base64_encode(force_bytes(user.id))
            token = PasswordResetTokenGenerator().make_token(user)

            frontend_url = "http://localhost:5173"
            link = f"{frontend_url}/reset-password/{uid}/{token}"

            print('Password Reset Link:', link)  # useful for debugging
            body = 'Click the following link to reset your password: \n' + link
            data = {
                'subject': 'Reset Your Password',
                'body': body,
                'to_email': user.email
            }
            util.send_email(data)
            return value
        else:
            raise serializers.ValidationError("You are not a registered user")
        
class UserPasswordResetSerializer(serializers.Serializer):
    """Decodes token from URL and sets new password"""
    password = serializers.CharField(max_length=128, write_only=True)

    class Meta:
        fields = ['password']

    def validate_password(self, attrs):
        try:
            # uid and token come from URL params via context
            uid = self.context.get('uid')
            token = self.context.get('token')
            id = smart_str(urlsafe_base64_decode(uid))
            user = User.objects.get(id=id)

            if not PasswordResetTokenGenerator().check_token(user, token):
                raise serializers.ValidationError('Token is not valid or expired')
            user.set_password(attrs)
            user.save()
            return attrs
        except Exception as e:
            raise serializers.ValidationError('Token is not valid or expired')
