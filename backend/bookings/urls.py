from django.urls import path
from .views import (
    VerifiedCaregiverListView,
    BookingCreateView,
    BookingListView,
    BookingRespondView,
    BookingMarkServiceCompleteView,
    BookingConfirmCompletionView,
    AssignedBookingsView,
    BookingUpdateStatusView,
    BookingProofUploadView,
    BookingUpdateLocationView,
    BookingCaregiverLocationView,
    CheckAvailabilityView,
)

urlpatterns = [
    path("caregivers/", VerifiedCaregiverListView.as_view(), name="caregivers-list"),
    path("", BookingCreateView.as_view(), name="booking-create"),
    path("check-availability/", CheckAvailabilityView.as_view(), name="check-availability"),
    path("list/", BookingListView.as_view(), name="booking-list"),
    path("assigned/", AssignedBookingsView.as_view(), name="assigned-bookings"),
    path("<int:pk>/update-status/", BookingUpdateStatusView.as_view(), name="booking-update-status"),
    path("<int:pk>/update-location/", BookingUpdateLocationView.as_view(), name="booking-update-location"),
    path("<int:pk>/caregiver-location/", BookingCaregiverLocationView.as_view(), name="booking-caregiver-location"),
    path("<int:pk>/upload-proof/", BookingProofUploadView.as_view(), name="booking-upload-proof"),
    path("<int:pk>/respond/", BookingRespondView.as_view(), name="booking-respond"),
    path("<int:pk>/mark-service-complete/", BookingMarkServiceCompleteView.as_view(), name="booking-mark-service-complete"),
    path("<int:pk>/confirm-completion/", BookingConfirmCompletionView.as_view(), name="booking-confirm-completion"),
]
