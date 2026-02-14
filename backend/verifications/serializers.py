from rest_framework import serializers
from .models import CaregiverVerification
from .validators import validate_image_file


class CaregiverVerificationSerializer(serializers.ModelSerializer):
    """Serializer for caregiver to view and upload verification documents"""
    citizenship_front_url = serializers.SerializerMethodField()
    citizenship_back_url = serializers.SerializerMethodField()
    certificate_url = serializers.SerializerMethodField()
    can_reupload = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CaregiverVerification
        fields = [
            'id',
            'verification_status',
            'rejection_reason',
            'citizenship_front',
            'citizenship_front_url',
            'citizenship_back',
            'citizenship_back_url',
            'certificate',
            'certificate_url',
            'uploaded_at',
            'can_reupload',
        ]
        read_only_fields = ['id', 'verification_status', 'rejection_reason', 'uploaded_at', 'can_reupload']
        extra_kwargs = {
            'citizenship_front': {'write_only': True},
            'citizenship_back': {'write_only': True},
            'certificate': {'write_only': True},
        }
    
    def _get_file_url(self, file_field):
        if file_field:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(file_field.url)
            return file_field.url
        return None
    
    def get_citizenship_front_url(self, obj):
        return self._get_file_url(obj.citizenship_front)
    
    def get_citizenship_back_url(self, obj):
        return self._get_file_url(obj.citizenship_back)
    
    def get_certificate_url(self, obj):
        return self._get_file_url(obj.certificate)
    
    def validate_citizenship_front(self, value):
        return validate_image_file(value)
    
    def validate_citizenship_back(self, value):
        return validate_image_file(value)
    
    def validate_certificate(self, value):
        return validate_image_file(value)


class AdminCaregiverVerificationSerializer(serializers.ModelSerializer):
    """Serializer for admin to view and manage verifications"""
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    profile_image = serializers.SerializerMethodField()
    verified_by_email = serializers.EmailField(source='verified_by.email', read_only=True, allow_null=True)
    citizenship_front_url = serializers.SerializerMethodField()
    citizenship_back_url = serializers.SerializerMethodField()
    certificate_url = serializers.SerializerMethodField()

    class Meta:
        model = CaregiverVerification
        fields = [
            'id',
            'user_id',
            'email',
            'username',
            'profile_image',
            'verification_status',
            'rejection_reason',
            'citizenship_front_url',
            'citizenship_back_url',
            'certificate_url',
            'uploaded_at',
            'verified_at',
            'verified_by_email',
        ]
        read_only_fields = ['uploaded_at', 'verified_at']

    def _get_file_url(self, file_field):
        if file_field:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(file_field.url)
            return file_field.url
        return None

    def get_profile_image(self, obj):
        try:
            profile = obj.user.profile
            if profile and profile.profile_image:
                return self._get_file_url(profile.profile_image)
        except Exception:
            pass
        return None

    def get_citizenship_front_url(self, obj):
        return self._get_file_url(obj.citizenship_front)
    
    def get_citizenship_back_url(self, obj):
        return self._get_file_url(obj.citizenship_back)
    
    def get_certificate_url(self, obj):
        return self._get_file_url(obj.certificate)

