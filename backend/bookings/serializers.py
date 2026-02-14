from rest_framework import serializers
from .models import Booking
from accounts.models import User, CaregiverProfile


class CaregiverListSerializer(serializers.ModelSerializer):
    """Serializes caregiver data for the Find Caregiver list view"""
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    service_types = serializers.ListField(child=serializers.CharField(), read_only=True)
    training_authority = serializers.CharField(read_only=True)
    certification_year = serializers.IntegerField(read_only=True, allow_null=True)
    available_hours = serializers.CharField(read_only=True)
    profile_image = serializers.SerializerMethodField()
    bio = serializers.CharField(read_only=True)
    gender = serializers.CharField(read_only=True, allow_null=True)
    verification_status = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    has_active_booking = serializers.SerializerMethodField()

    class Meta:
        model = CaregiverProfile
        fields = [
            "user_id",
            "username",
            "email",
            "service_types",
            "training_authority",
            "certification_year",
            "available_hours",
            "profile_image",
            "bio",
            "gender",
            "verification_status",
            "address",
            "has_active_booking",
        ]

    def get_profile_image(self, obj):
        try:
            profile = obj.user.profile
        except Exception:
            return None
        if profile and profile.profile_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(profile.profile_image.url)
            return profile.profile_image.url
        return None

    def get_verification_status(self, obj):
        try:
            return obj.user.verification.verification_status
        except Exception:
            return "pending"

    def get_address(self, obj):
        try:
            return obj.user.profile.address
        except Exception:
            return None

    def get_has_active_booking(self, obj):
        """Check if current user already has pending/accepted booking with this caregiver"""
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == "careseeker":
            has_active = Booking.objects.filter(
                family=request.user,
                caregiver=obj.user,
                status__in=["pending", "accepted"]
            ).exists()
            return has_active
        return False


class BookingCreateSerializer(serializers.ModelSerializer):
    """Validates and creates new booking request"""
    service_types = serializers.ListField(child=serializers.CharField(), required=True)
    person_name = serializers.CharField(required=True, max_length=255)
    person_age = serializers.IntegerField(required=True, min_value=0, max_value=150)
    start_time = serializers.TimeField(required=True)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    emergency_contact_phone = serializers.CharField(required=True, max_length=20)
    additional_info = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Booking
        fields = [
            "caregiver",
            "service_types",
            "person_name",
            "person_age",
            "date",
            "start_time",
            "duration_hours",
            "emergency_contact_name",
            "emergency_contact_phone",
            "additional_info",
            "notes",
        ]

    def validate_date(self, value):
        from django.utils import timezone
        if value < timezone.localdate():
            raise serializers.ValidationError("Date cannot be in the past")
        return value

    def validate_duration_hours(self, value):
        if value < 1 or value > 24:
            raise serializers.ValidationError("Duration must be between 1 and 24 hours")
        return value

    def validate_service_types(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one service must be selected")
        return value

    def validate(self, data):
        """Ensure requested services are actually offered by this caregiver"""
        caregiver_id = data.get("caregiver")
        if caregiver_id:
            try:
                caregiver_profile = CaregiverProfile.objects.get(user_id=caregiver_id)
                caregiver_services = set(caregiver_profile.service_types or [])
                requested_services = set(data.get("service_types", []))

                if not requested_services.issubset(caregiver_services):
                    invalid_services = requested_services - caregiver_services
                    raise serializers.ValidationError(
                        f"Services not offered by this caregiver: {', '.join(invalid_services)}"
                    )
            except CaregiverProfile.DoesNotExist:
                raise serializers.ValidationError("Caregiver profile not found")
        return data


class BookingSerializer(serializers.ModelSerializer):
    """Full booking details - used for list and detail views"""
    family_name = serializers.CharField(source="family.username", read_only=True)
    caregiver_name = serializers.CharField(source="caregiver.username", read_only=True)
    family_profile_image = serializers.SerializerMethodField()
    caregiver_profile_image = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "family",
            "family_name",
            "family_profile_image",
            "caregiver",
            "caregiver_name",
            "caregiver_profile_image",
            "service_types",
            "person_name",
            "person_age",
            "date",
            "start_time",
            "duration_hours",
            "emergency_contact_name",
            "emergency_contact_phone",
            "additional_info",
            "notes",
            "status",
            "created_at",
        ]
        read_only_fields = ["family", "status", "created_at"]

    def get_family_profile_image(self, obj):
        try:
            profile = obj.family.profile
            if profile and profile.profile_image:
                request = self.context.get("request")
                if request:
                    return request.build_absolute_uri(profile.profile_image.url)
                return profile.profile_image.url
        except Exception:
            pass
        return None

    def get_caregiver_profile_image(self, obj):
        try:
            profile = obj.caregiver.profile
            if profile and profile.profile_image:
                request = self.context.get("request")
                if request:
                    return request.build_absolute_uri(profile.profile_image.url)
                return profile.profile_image.url
        except Exception:
            pass
        return None
