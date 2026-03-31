from django.urls import path
from .views import (
    PaymentListView,
    InitiateKhaltiPaymentView,
    VerifyKhaltiPaymentView,
    PaymentStatusView,
)

# Payment-related API endpoints
urlpatterns = [
    path("", PaymentListView.as_view(), name="payment-list"),
    path("initiate/", InitiateKhaltiPaymentView.as_view(), name="payment-initiate"),  # initiate Khalti payment
    path("verify/", VerifyKhaltiPaymentView.as_view(), name="payment-verify"),        # verify Khalti payment
    path("status/<int:booking_id>/", PaymentStatusView.as_view(), name="payment-status"),  # get payment status
]
