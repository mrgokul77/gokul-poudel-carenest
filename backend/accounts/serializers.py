import os

from rest_framework import serializers
from accounts.models import *
from django.utils.encoding import smart_str, force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from accounts.utils import Util
import random
from django.utils.timezone import now
from datetime import timedelta
import json

class UserRegistrationSerializer(serializers.ModelSerializer):
    # generates random 6-digit code and sends it via email
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'role']
        extra_kwargs = {
            'password': {'write_only': True}
        }
        
    def validate(self, attrs):
        # made it a property so create() can also access it
        self.otp = random.randint(100000, 999999)
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        user.otp = self.otp
        user.otp_created_at = now()
        user.is_verified = False
        user.save()

        UserProfile.objects.create(user=user)
        if user.role == 'caregiver':
            CaregiverProfile.objects.create(user=user)

        body = f"Your CareNest OTP is {self.otp}. It is valid for 10 minutes."
        data = {
            'subject': 'Verify your CareNest account',
            'body': body,
            'to_email': user.email
        }

        try:
            Util.send_email(data)
        except Exception as e:
            print(f"Email sending failed: {e}")
            user.delete()
            raise serializers.ValidationError("Failed to send OTP email. Please try again.")

        return user

class VerifyOTPSerializer(serializers.Serializer):
    # matches what frontend sends and compares with stored OTP
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

        # TODO: make this configurable, hardcoded 10 mins for now
        if now() > user.otp_created_at + timedelta(minutes=10):
            raise serializers.ValidationError("OTP has expired")

        # marking verified so login works
        user.is_verified = True
        user.otp = None
        user.save()

        # just in case something broke during signup (safety net)
        if not hasattr(user, 'profile'):
            UserProfile.objects.create(user=user)
        if user.role == 'caregiver' and not hasattr(user, 'caregiver_profile'):
            CaregiverProfile.objects.create(user=user)

        return attrs

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class SavePushTokenSerializer(serializers.Serializer):
    push_token = serializers.CharField(max_length=255)

    def validate_push_token(self, value):
        token = value.strip()
        if not token:
            raise serializers.ValidationError("push_token is required")
        return token


class CaregiverProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaregiverProfile
        fields = [
            "service_types",
            "training_authority",
            "certification_year",
            "available_hours",
            "bio",
            "gender",
            "hourly_rate"
        ]

class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    address = serializers.CharField(required=False, allow_blank=True)
    profile_image = serializers.ImageField(required=False, allow_null=True, use_url=False)

    review_count = serializers.SerializerMethodField(read_only=True)
    average_rating = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "email",
            "username",
            "role",
            "phone",
            "address",
            "profile_image",
            "review_count",
            "average_rating",
        ]

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def get_review_count(self, obj):
        user = obj.user
        if hasattr(user, "role") and user.role == "caregiver":
            from reviews.models import Review
            return Review.objects.filter(caregiver=user).count()
        return None

    def get_average_rating(self, obj):
        user = obj.user
        if hasattr(user, "role") and user.role == "caregiver":
            from reviews.models import Review
            from django.db.models import Avg
            avg = Review.objects.filter(caregiver=user).aggregate(avg=Avg("rating"))["avg"]
            if avg is not None:
                return round(avg, 1)
        return None

class UserChangePasswordSerializer(serializers.Serializer):
    password = serializers.CharField(max_length=128, write_only=True)

    class Meta:
        fields = ['password']

    def validate_password(self, data):
        return data

class SendPasswordResetEmailSerializer(serializers.Serializer):
    # Generates a token and sends link. Rate-limited to prevent spam
    email = serializers.EmailField(max_length=255)

    class Meta:
        fields = ['email']

    def validate_email(self, value):
        from django.core.cache import cache
        from django.utils import timezone
        import time
        if User.objects.filter(email=value).exists():
            user = User.objects.get(email=value)
            now_ts = int(time.time())
            email_key = f"reset_req_{value.lower()}"
            hourly_key = f"reset_hour_{value.lower()}"

            # prevents them from spamming reset requests
            last_req = cache.get(email_key)
            if last_req and now_ts - last_req < 60:
                raise serializers.ValidationError("Please wait 60 seconds before requesting another reset link.")

            # max 5 resets per hour to prevent abuse
            req_times = cache.get(hourly_key, [])
            req_times = [t for t in req_times if now_ts - t < 3600]
            if len(req_times) >= 5:
                raise serializers.ValidationError("Too many reset attempts. Please try again later.")

            cache.set(email_key, now_ts, timeout=3600)
            req_times.append(now_ts)
            cache.set(hourly_key, req_times, timeout=3600)

            uid = urlsafe_base64_encode(force_bytes(user.id))
            token = PasswordResetTokenGenerator().make_token(user)
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
            link = f"{frontend_url}/reset-password/{uid}/{token}"
            print('Password Reset Link:', link)
            body = 'Click the following link to reset your password: \n' + link
            data = {
                'subject': 'Reset Your Password',
                'body': body,
                'to_email': user.email
            }
            Util.send_email(data)
            return value
        else:
            raise serializers.ValidationError("You are not a registered user")
        
class UserPasswordResetSerializer(serializers.Serializer):
    # validates the token and sets a new password if it's still valid
    password = serializers.CharField(max_length=128, write_only=True)

    class Meta:
        fields = ['password']

    def validate_password(self, attrs):
        try:
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


class EmergencySerializer(serializers.ModelSerializer):
    careseeker_name = serializers.CharField(source="careseeker.username", read_only=True)
    careseeker_email = serializers.EmailField(source="careseeker.email", read_only=True)
    careseeker_phone = serializers.SerializerMethodField()
    careseeker_profile_image = serializers.SerializerMethodField()
    caregiver_name = serializers.SerializerMethodField()
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    booking_status = serializers.CharField(source="booking.status", read_only=True)

    class Meta:
        model = Emergency
        fields = [
            "id",
            "careseeker",
            "careseeker_name",
            "careseeker_email",
            "careseeker_phone",
            "careseeker_profile_image",
            "caregiver_name",
            "booking",
            "booking_id",
            "booking_status",
            "status",
            "admin_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "careseeker",
            "careseeker_name",
            "careseeker_email",
            "careseeker_phone",
            "careseeker_profile_image",
            "caregiver_name",
            "booking_id",
            "booking_status",
            "created_at",
            "updated_at",
        ]

    def get_careseeker_phone(self, obj):
        profile = getattr(obj.careseeker, "profile", None)
        return profile.phone if profile else None

    def get_careseeker_profile_image(self, obj):
        profile = getattr(obj.careseeker, "profile", None)
        if not profile or not profile.profile_image:
            return None
        return profile.profile_image.name

    def get_caregiver_name(self, obj):
        booking = getattr(obj, "booking", None)
        caregiver = getattr(booking, "caregiver", None) if booking else None
        return caregiver.username if caregiver else None


class EmergencyCreateSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_booking_id(self, value):
        if value in (None, ""):
            return None
        return value


class EmergencyUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["in_progress", "resolved"], required=False)
    admin_note = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class UserActivitySerializer(serializers.ModelSerializer):
    careseeker_name = serializers.CharField(source="user.username", read_only=True)
    careseeker_email = serializers.EmailField(source="user.email", read_only=True)
    careseeker_profile_image = serializers.SerializerMethodField()
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)

    class Meta:
        model = UserActivity
        fields = [
            "id",
            "user",
            "careseeker_name",
            "careseeker_email",
            "careseeker_profile_image",
            "activity_type",
            "booking",
            "booking_id",
            "created_at",
        ]
        read_only_fields = fields

    def get_careseeker_profile_image(self, obj):
        profile = getattr(obj.user, "profile", None)
        if not profile or not profile.profile_image:
            return None
        return profile.profile_image.name


class UserActivityCreateSerializer(serializers.Serializer):
    activity_type = serializers.ChoiceField(choices=[choice[0] for choice in UserActivity.ACTIVITY_CHOICES])
    booking_id = serializers.IntegerField(required=False, allow_null=True)
