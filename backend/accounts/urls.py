
from django.urls import path,include
from .views import *

urlpatterns = [
    path('register/',UserRegistrationView.as_view(), name='register'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('login/',UserLoginView.as_view(), name='login'),
    path('profile/',UserProfileView.as_view(), name='profile'),
    path('profile/caregiver/', CaregiverProfileView.as_view(), name='caregiver-profile'),
    path('admin/profile/<int:user_id>/', AdminUserProfileView.as_view(), name='admin-user-profile'),
    path('changepassword/',UserChangePasswordView.as_view(), name='change-password'),
    path('send-reset-password-email/',SendPasswordResetEmailView.as_view(), name='send-reset-password-email'),
    path('reset-password/<uid>/<token>/',UserPasswordResetView.as_view(), name='reset-password'),
]