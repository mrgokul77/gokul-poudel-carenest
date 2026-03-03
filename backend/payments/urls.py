from django.urls import path
from .views import InitiateKhaltiPaymentView, VerifyKhaltiPaymentView, PaymentStatusView

urlpatterns = [
    path("initiate/", InitiateKhaltiPaymentView.as_view(), name="payment-initiate"),
    path("verify/", VerifyKhaltiPaymentView.as_view(), name="payment-verify"),
    path("status/<int:booking_id>/", PaymentStatusView.as_view(), name="payment-status"),
]
