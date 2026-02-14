from django.contrib import admin
from .models import CaregiverVerification


@admin.register(CaregiverVerification)
class CaregiverVerificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'verification_status', 'uploaded_at', 'verified_at']
    list_filter = ['verification_status', 'uploaded_at']
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['uploaded_at', 'verified_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Documents', {
            'fields': ('citizenship_front', 'citizenship_back', 'certificate')
        }),
        ('Verification Status', {
            'fields': ('verification_status', 'rejection_reason', 'uploaded_at', 'verified_at', 'verified_by')
        }),
    )
