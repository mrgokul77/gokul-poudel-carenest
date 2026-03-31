from django.urls import path

from .views import ReviewCreateView, ReviewListView


urlpatterns = [
    path("", ReviewCreateView.as_view(), name="review-create"),
    path("caregiver/<int:caregiver_id>/", ReviewListView.as_view(), name="review-list-caregiver"),
]

