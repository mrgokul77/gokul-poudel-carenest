from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

from .views import *
from notifications.views import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationUnreadCountView,
)

urlpatterns = [
    path('register/',UserRegistrationView.as_view(), name='register'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('login/',UserLoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('profile/',UserProfileView.as_view(), name='profile'),
    path('profile/caregiver/', CaregiverProfileView.as_view(), name='caregiver-profile'),
    path('admin/profile/<int:user_id>/', AdminUserProfileView.as_view(), name='admin-user-profile'),
    path('changepassword/',UserChangePasswordView.as_view(), name='change-password'),
    path('send-reset-password-email/',SendPasswordResetEmailView.as_view(), name='send-reset-password-email'),
    path('reset-password/<uid>/<token>/',UserPasswordResetView.as_view(), name='reset-password'),
    path('status/<int:user_id>/', UserStatusView.as_view(), name='user-status'),
    path('notifications/', NotificationListView.as_view(), name='notifications'),
    path('notifications/unread-count/', NotificationUnreadCountView.as_view(), name='notifications-unread-count'),
    path('notifications/mark-all-read/', NotificationMarkAllReadView.as_view(), name='notifications-mark-all-read'),
    path('notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
]