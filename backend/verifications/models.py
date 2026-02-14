from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from .validators import validate_image_file


class CaregiverVerification(models.Model):
    """
    Stores caregiver verification documents for admin review.
    Admin approves/rejects based on uploaded citizenship and certificate images.
    """
    VERIFICATION_STATUS = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="verification"  # user.verification to check status
    )
    citizenship_front = models.ImageField(
        upload_to="verification/citizenship/",
        null=True,
        blank=True,
        help_text="Front image of citizenship document"
    )
    citizenship_back = models.ImageField(
        upload_to="verification/citizenship/",
        null=True,
        blank=True,
        help_text="Back image of citizenship document"
    )
    certificate = models.ImageField(
        upload_to="verification/certificates/",
        null=True,
        blank=True,
        help_text="Training/qualification certificate"
    )
    verification_status = models.CharField(
        max_length=10,
        choices=VERIFICATION_STATUS,
        default='pending'  # starts pending until admin reviews
    )
    rejection_reason = models.TextField(blank=True, null=True)  # admin provides reason on reject
    uploaded_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)  # timestamp of admin decision
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_caregivers"  # track which admin verified
    )

    def __str__(self):
        return f"{self.user.email} - {self.verification_status}"

    class Meta:
        verbose_name = "Caregiver Verification"
        verbose_name_plural = "Caregiver Verifications"
        ordering = ['-uploaded_at']

    def clean(self):
        """Validate all document files"""
        errors = {}
        
        for field_name in ['citizenship_front', 'citizenship_back', 'certificate']:
            file = getattr(self, field_name, None)
            if file:
                try:
                    validate_image_file(file)
                except ValidationError as e:
                    errors[field_name] = e.messages if hasattr(e, 'messages') else [str(e)]
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def can_reupload(self):
        return self.verification_status == 'rejected'

    @property
    def is_pending(self):
        return self.verification_status == 'pending'

    @property
    def is_approved(self):
        return self.verification_status == 'approved'

    @property
    def is_rejected(self):
        return self.verification_status == 'rejected'
