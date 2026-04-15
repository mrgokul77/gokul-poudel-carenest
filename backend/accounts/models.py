from django.contrib.auth.models import BaseUserManager, AbstractBaseUser, PermissionsMixin
from django.db import models

# needed this so we could use email instead of username for login
class UserManager(BaseUserManager):
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
        # skipping OTP for admin so they can log in immediately
        user = self.create_user(
            email=email,
            username=username,
            password=password,
        )
        user.is_admin = True
        user.is_superuser = True
        user.role = "admin"
        user.is_verified = True
        user.save(using=self._db)
        return user

# three roles: careseeker (looking for help), caregiver (provides help), admin (manages everything)
class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('careseeker', 'Care Seeker'),
        ('caregiver', 'Caregiver'),
        ('admin', 'Admin'),
    )
    email = models.EmailField(verbose_name="Email", max_length=255, unique=True)
    username = models.CharField(max_length=30, unique=True)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    # storing OTP here so we can send it via email and verify it later
    is_verified = models.BooleanField(default=False)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)

    # tracking who's online for chat - real-time updates via WebSocket
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    push_token = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ['username']
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='careseeker')

    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        # only admins can access Django admin stuff
        return self.is_admin

    def has_module_perms(self, app_label):
        return True

    @property
    def is_staff(self):
        # needed this so admin users can access /admin panel
        return self.is_admin


# basic info for everyone - helps with finding caregivers by location
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)  # TODO: maybe filter profiles by distance later
    profile_image = models.ImageField(upload_to="profiles/", null=True, blank=True)

    def __str__(self):
        return f"Profile: {self.user.email}"

# only caregivers need this - describes what they offer and their experience
class CaregiverProfile(models.Model):
    GENDER_CHOICES = (
        ('male', 'Male'),
        ('female', 'Female'),
        ('prefer_not_to_say', 'Prefer not to say'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="caregiver_profile")
    service_types = models.JSONField(default=list, blank=True)  # caregiver services offered
    training_authority = models.CharField(max_length=255, blank=True)
    certification_year = models.IntegerField(null=True, blank=True)
    available_hours = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, null=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"Caregiver Data: {self.user.email}"


class Emergency(models.Model):
    STATUS_PENDING = "pending"
    STATUS_NOTIFIED = "notified"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_RESOLVED = "resolved"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_NOTIFIED, "Notified"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_RESOLVED, "Resolved"),
    )

    careseeker = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="emergencies",
    )
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emergencies",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Emergency #{self.id} - {self.careseeker.email} - {self.status}"


class UserActivity(models.Model):
    ACTIVITY_MOBILE_LOGIN = "mobile_login"
    ACTIVITY_EMERGENCY_TRIGGERED = "emergency_triggered"
    ACTIVITY_BOOKING_VIEWED = "booking_viewed"
    ACTIVITY_NOTIFICATION_RECEIVED = "notification_received"
    ACTIVITY_BOOKING_COMPLETED = "booking_completed"

    ACTIVITY_CHOICES = (
        (ACTIVITY_MOBILE_LOGIN, "Logged in from mobile"),
        (ACTIVITY_EMERGENCY_TRIGGERED, "Emergency triggered"),
        (ACTIVITY_BOOKING_VIEWED, "Viewed booking"),
        (ACTIVITY_NOTIFICATION_RECEIVED, "Notification received"),
        (ACTIVITY_BOOKING_COMPLETED, "Booking completed"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    activity_type = models.CharField(max_length=40, choices=ACTIVITY_CHOICES)
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activities",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.activity_type}"
