
from django.contrib import admin
from django.urls import path,include
from accounts.views import EmergencyListCreateView, EmergencyDetailView, EmergencyPendingCountView, EmergencyNotifyCaregiverView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/user/', include('accounts.urls')),        # auth, registration, profiles
    path('api/admin/', include('accounts.admin_urls')),  # admin user management
    path('api/caregiver/', include('accounts.caregiver_urls')),  # caregiver dashboard
    path('api/careseeker/', include('accounts.careseeker_urls')),  # careseeker dashboard
    path('api/verifications/', include('verifications.urls')),  # document upload, admin verification
    path('api/bookings/', include('bookings.urls')),    # caregiver list, booking CRUD
    path('api/reviews/', include('reviews.urls')),      # caregiver ratings & reviews
    path('api/payments/', include('payments.urls')),    # payment endpoints
    path('api/chat/', include('chat.urls')),            # chat REST + WebSocket
    path('api/announcements/', include('announcements.urls')),
    path('api/complaints/', include('complaints.urls')),
    path('api/emergency/', EmergencyListCreateView.as_view(), name='emergency-list-create'),
    path('api/emergency/<int:pk>/', EmergencyDetailView.as_view(), name='emergency-detail'),
    path('api/emergency/<int:pk>/notify-caregiver/', EmergencyNotifyCaregiverView.as_view(), name='emergency-notify-caregiver'),
    path('api/emergency/pending-count/', EmergencyPendingCountView.as_view(), name='emergency-pending-count'),
]

# Serve uploaded files (profile images, verification docs) in development
from django.conf import settings
from django.conf.urls.static import static

urlpatterns += static(
    settings.MEDIA_URL,
    document_root=settings.MEDIA_ROOT
)