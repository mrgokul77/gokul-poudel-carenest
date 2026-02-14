from django.urls import path
from .views import (
    VerifiedCaregiverListView,
    BookingCreateView,
    BookingListView,
    BookingRespondView,
)

urlpatterns = [
    path("caregivers/", VerifiedCaregiverListView.as_view(), name="caregivers-list"),
    path("", BookingCreateView.as_view(), name="booking-create"),
    path("list/", BookingListView.as_view(), name="booking-list"),
    path("<int:pk>/respond/", BookingRespondView.as_view(), name="booking-respond"),
]
