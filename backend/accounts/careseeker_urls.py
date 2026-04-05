from django.urls import path
from .views import (
    CareseekerDashboardSummaryView,
    CareseekerBookingListView,
    CareseekerBookingDetailView,
)

urlpatterns = [
    path("dashboard-summary/", CareseekerDashboardSummaryView.as_view(), name="careseeker-dashboard-summary"),
    path("bookings/", CareseekerBookingListView.as_view(), name="careseeker-bookings"),
    path("bookings/<int:pk>/", CareseekerBookingDetailView.as_view(), name="careseeker-booking-detail"),
]
