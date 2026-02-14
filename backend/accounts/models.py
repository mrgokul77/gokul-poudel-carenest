from django.contrib.auth.models import BaseUserManager, AbstractBaseUser,PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    """Handles user creation - default role is careseeker"""

    def create_user(self, email, username, password=None, role="careseeker"):
        if not email:
            raise ValueError("Users must have an email address")

        user = self.model(
            email=self.normalize_email(email),
            username=username,
            role=role
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None):
        """Admin users skip OTP and get full access"""
        user = self.create_user(
            email=email,
            username=username,
            password=password,
        )

        user.is_admin = True
        user.is_superuser = True
        user.role = "admin"
        user.is_verified = True  # admins bypass email verification

        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model - email as username, role-based access"""
    ROLE_CHOICES = (
        ('careseeker', 'Care Seeker'),
        ('caregiver', 'Caregiver'),
        ('admin', 'Admin'),
    )
        
    email = models.EmailField(
        verbose_name="Email",
        max_length=255,
        unique=True,
    )
    username = models.CharField(max_length=30, unique=True)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)

    # OTP verification - cleared after successful verify
    is_verified = models.BooleanField(default=False)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ['username']

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='careseeker')

    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        # Only admins have Django permissions
        return self.is_admin

    def has_module_perms(self, app_label):
        return True

    @property
    def is_staff(self):
        # Required for Django admin access
        return self.is_admin


class UserProfile(models.Model):
    """Common profile for all users - phone, address, image"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)  # city/area for location filtering
    profile_image = models.ImageField(upload_to="profiles/", null=True, blank=True)

    def __str__(self):
        return f"Profile: {self.user.email}"

class CaregiverProfile(models.Model):
    """Extra fields for caregivers - services, credentials, bio"""
    GENDER_CHOICES = (
        ('male', 'Male'),
        ('female', 'Female'),
        ('prefer_not_to_say', 'Prefer not to say'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="caregiver_profile")
    service_types = models.JSONField(default=list, blank=True)  # array of service names
    training_authority = models.CharField(max_length=255, blank=True)
    certification_year = models.IntegerField(null=True, blank=True)
    available_hours = models.CharField(max_length=255, blank=True) 
    bio = models.TextField(blank=True) 
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, null=True)

    def __str__(self):
        return f"Caregiver Data: {self.user.email}"
