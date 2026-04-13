from rest_framework import serializers
from datetime import timedelta
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .models import Booking
from accounts.models import User, CaregiverProfile
from verifications.models import CaregiverVerification
from reviews.models import Review
from django.db.models import Avg, Count


class CaregiverListSerializer(serializers.ModelSerializer):
    # used on the Find Caregiver page to show who's available
    booking_status = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
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
    hourly_rate = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
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
            "hourly_rate",
            "verification_status",
            "address",
            "has_active_booking",
            "booking_status",
            "average_rating",
            "review_count",
        ]

    def _get_image_path(self, image_field):
        return image_field.name if image_field else None

    def get_booking_status(self, obj):
        # shows if the current user already has a pending/active booking with this caregiver
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == "careseeker":
            booking = Booking.objects.filter(
                family=request.user,
                caregiver=obj.user
            ).order_by('-created_at').first()
            if booking:
                return booking.status if booking.status != "cancelled" else None
        return None

    def get_profile_image(self, obj):
        try:
            profile = obj.user.profile
        except Exception:
            return None
        if profile and profile.profile_image:
            return self._get_image_path(profile.profile_image)
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
        """Check if current user already has an active booking with this caregiver"""
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == "careseeker":
            has_active = Booking.objects.filter(
                family=request.user,
                caregiver=obj.user,
                status__in=["pending", "accepted", "completion_requested", "awaiting_confirmation"]
            ).exists()
            return has_active
        return False

    def get_average_rating(self, obj):
        agg = Review.objects.filter(caregiver=obj.user).aggregate(
            avg_rating=Avg("rating"),
            review_count=Count("id"),
        )
        if not agg["review_count"]:
            return None
        return round(agg["avg_rating"] or 0, 1)

    def get_review_count(self, obj):
        agg = Review.objects.filter(caregiver=obj.user).aggregate(
            review_count=Count("id"),
        )
        return agg["review_count"] or 0



class BookingCreateSerializer(serializers.ModelSerializer):
    """Validates and creates new booking request"""
    service_types = serializers.ListField(child=serializers.CharField(), required=True)
    person_name = serializers.CharField(required=True, max_length=255)
    person_age = serializers.IntegerField(required=True, min_value=0, max_value=150)
    start_time = serializers.TimeField(required=True)
    emergency_contact_phone = serializers.CharField(required=True, max_length=20)
    additional_info = serializers.CharField(required=False, allow_blank=True)
    service_address = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)

    def validate_emergency_contact_phone(self, value):
        value = value.strip()
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        return value

    

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
            "emergency_contact_phone",
            "additional_info",
            "service_address",
            "latitude",
            "longitude",
        ]

    def validate_date(self, value):
        from django.utils import timezone
        today = timezone.localdate()
        if value < today:
            raise serializers.ValidationError("You cannot select a past date or time.")
        return value

    def validate(self, data):
        """Ensure requested services are offered, validate hourly slots, and enforce 3-hour lead time"""
        from django.utils import timezone
        from datetime import datetime, timedelta

        date = data.get("date")
        start_time = data.get("start_time")

        if date and start_time:
            # Only allow hourly slots (minutes must be 0)
            if start_time.minute != 0 or start_time.second != 0:
                raise serializers.ValidationError({
                    "start_time": ["Invalid time slot. Please select an hourly slot."]
                })

            today = timezone.localdate()
            if date == today:
                now = timezone.localtime()
                min_booking_time = now + timedelta(hours=3)
                start_dt = timezone.make_aware(
                    datetime.combine(date, start_time),
                    timezone.get_current_timezone(),
                )
                if start_dt < min_booking_time:
                    raise serializers.ValidationError({
                        "start_time": ["Invalid time slot. Please select a valid available slot."]
                    })
        
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

        lat = data.get("latitude")
        lng = data.get("longitude")
        if (lat is None) != (lng is None):
            raise serializers.ValidationError(
                "latitude and longitude must both be provided or both omitted."
            )
        return data

    def validate_duration_hours(self, value):
        if value < 1 or value > 24:
            raise serializers.ValidationError("Duration must be between 1 and 24 hours")
        return value

    def validate_service_types(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one service must be selected")
        return value


class BookingSerializer(serializers.ModelSerializer):
    """Full booking details - used for list and detail views"""
    family_name = serializers.CharField(source="family.username", read_only=True)
    caregiver_name = serializers.CharField(source="caregiver.username", read_only=True)
    family_profile_image = serializers.SerializerMethodField()
    caregiver_profile_image = serializers.SerializerMethodField()
    booking_status = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()
    review_rating = serializers.SerializerMethodField()
    has_review = serializers.SerializerMethodField()
    proof_image = serializers.ImageField(read_only=True, use_url=False)

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
            "total_amount",
            "emergency_contact_phone",
            "service_address",
            "latitude",
            "longitude",
            "additional_info",
            "status",
            "rejection_reason",
            "check_in_time",
            "check_out_time",
            "proof_image",
            "booking_status",
            "payment_status",
            "verification_status",
            "review_rating",
            "has_review",
            "created_at",
        ]
        read_only_fields = ["family", "status", "created_at", "total_amount"]

    def get_booking_status(self, obj):
        """
        Workflow state for display. Statuses map directly:
        pending, accepted, completion_requested, awaiting_confirmation, completed, rejected, expired
        """
        return obj.status

    def get_payment_status(self, obj):
        """Paid or Unpaid for display badges. Checks Payment model for accepted/completed bookings."""
        if obj.status in ("accepted", "completion_requested", "awaiting_confirmation", "completed"):
            try:
                from payments.models import Payment
                payment = Payment.objects.get(booking=obj)
                return "paid" if payment.status == "completed" else "unpaid"
            except ObjectDoesNotExist:
                return "unpaid"
        return "unpaid"  # pending, rejected, expired

    def get_review_rating(self, obj):
        try:
            return obj.review.rating
        except Review.DoesNotExist:
            return None
        except AttributeError:
            # related_name may not be prefetched
            review = Review.objects.filter(booking=obj).first()
            return review.rating if review else None

    def get_has_review(self, obj):
        return Review.objects.filter(booking=obj).exists()


    def get_family_profile_image(self, obj):
        try:
            profile = obj.family.profile
            if profile and profile.profile_image:
                return profile.profile_image.name
        except Exception:
            pass
        return None

    def get_caregiver_profile_image(self, obj):
        try:
            profile = obj.caregiver.profile
            if profile and profile.profile_image:
                return profile.profile_image.name
        except Exception:
            pass
        return None

    def get_verification_status(self, obj):
        try:
            verification = CaregiverVerification.objects.get(user=obj.caregiver)
            return verification.verification_status
        except CaregiverVerification.DoesNotExist:
            return None


class BookingStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=["accepted", "rejected", "in_progress", "awaiting_confirmation", "completed"]
    )
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    timestamp = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        booking = self.context["booking"]
        requested_status = attrs["status"]

        allowed_next_statuses = {
            "pending": ["accepted", "rejected"],
            "accepted": ["in_progress"],
            "in_progress": ["awaiting_confirmation", "completed"],
        }

        if requested_status not in allowed_next_statuses.get(booking.status, []):
            raise serializers.ValidationError({
                "status": f"Invalid status change from {booking.status} to {requested_status}."
            })

        raw_timestamp = attrs.get("timestamp")
        parsed_timestamp = timezone.now()

        if raw_timestamp:
            parsed_timestamp = parse_datetime(raw_timestamp)
            if parsed_timestamp is None:
                raise serializers.ValidationError({"timestamp": "Invalid ISO datetime."})
            if timezone.is_naive(parsed_timestamp):
                parsed_timestamp = timezone.make_aware(parsed_timestamp, timezone.get_current_timezone())

        now = timezone.localtime()

        if requested_status == "accepted" and booking.status != "pending":
            raise serializers.ValidationError({"status": "Only pending bookings can be accepted."})

        if requested_status == "in_progress":
            if now < booking.start_datetime:
                raise serializers.ValidationError({
                    "status": "Cannot check in before booked time."
                })

        if requested_status in ("awaiting_confirmation", "completed"):
            if booking.status != "in_progress":
                raise serializers.ValidationError({
                    "status": "Cannot check out when booking is not in_progress."
                })

            if not booking.check_in_time:
                raise serializers.ValidationError({
                    "status": "Check in time is missing."
                })

            min_checkout_time = booking.check_in_time + timedelta(hours=booking.duration_hours)
            if now < min_checkout_time:
                raise serializers.ValidationError({
                    "status": "You cannot check out before the service duration is complete"
                })

        attrs["parsed_timestamp"] = parsed_timestamp
        return attrs


class BookingProofUploadSerializer(serializers.Serializer):
    proof_image = serializers.ImageField(required=True, use_url=False)


def _booking_serializer_get_proof_image(self, obj):
    request = self.context.get("request")
    if getattr(obj, "proof_image", None):
        try:
            if request:
                return request.build_absolute_uri(obj.proof_image.url)
            return obj.proof_image.url
        except Exception:
            return None
    return None


def _booking_serializer_get_caregiver_latitude(self, obj):
    try:
        value = getattr(obj, "caregiver_latitude", None)
        return float(value) if value is not None else None
    except Exception:
        return None


def _booking_serializer_get_caregiver_longitude(self, obj):
    try:
        value = getattr(obj, "caregiver_longitude", None)
        return float(value) if value is not None else None
    except Exception:
        return None


BookingSerializer.proof_image = serializers.SerializerMethodField()
BookingSerializer.get_proof_image = _booking_serializer_get_proof_image
BookingSerializer.caregiver_latitude = serializers.SerializerMethodField()
BookingSerializer.get_caregiver_latitude = _booking_serializer_get_caregiver_latitude
BookingSerializer.caregiver_longitude = serializers.SerializerMethodField()
BookingSerializer.get_caregiver_longitude = _booking_serializer_get_caregiver_longitude

if hasattr(BookingSerializer, "Meta") and hasattr(BookingSerializer.Meta, "fields"):
    _booking_fields = list(BookingSerializer.Meta.fields)
    for _extra_field in ("caregiver_latitude", "caregiver_longitude"):
        if _extra_field not in _booking_fields:
            _booking_fields.append(_extra_field)
    BookingSerializer.Meta.fields = _booking_fields
