from django.db import models


class Announcement(models.Model):
    class TargetAudience(models.TextChoices):
        ALL = "all", "All Users"
        CAREGIVERS = "caregivers", "Caregivers"
        CARESEEKERS = "careseekers", "Careseekers"

    title = models.CharField(max_length=255)
    message = models.TextField()
    is_active = models.BooleanField(default=True)
    is_important = models.BooleanField(default=False)
    target_audience = models.CharField(
        max_length=20,
        choices=TargetAudience.choices,
        default=TargetAudience.ALL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
