
from django.contrib import admin
from django.urls import path,include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/user/', include('accounts.urls')),        # auth, registration, profiles
    path('api/verifications/', include('verifications.urls')),  # document upload, admin verification
    path('api/bookings/', include('bookings.urls')),    # caregiver list, booking CRUD
]

# Serve uploaded files (profile images, verification docs) in development
from django.conf import settings
from django.conf.urls.static import static

urlpatterns += static(
    settings.MEDIA_URL,
    document_root=settings.MEDIA_ROOT
)