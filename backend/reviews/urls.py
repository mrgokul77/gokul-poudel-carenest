from django.urls import path

from .views import ReviewBookingStatusView, ReviewCreateView, ReviewListView


urlpatterns = [
    path("", ReviewCreateView.as_view(), name="review-create"),
    path("caregiver/<int:caregiver_id>/", ReviewListView.as_view(), name="review-list-caregiver"),
    path("booking/<int:booking_id>/status/", ReviewBookingStatusView.as_view(), name="review-booking-status"),
]

