import requests
from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from bookings.models import Booking
from .models import Payment
from .serializers import PaymentSerializer, KhaltiInitiateSerializer, KhaltiVerifySerializer


class InitiateKhaltiPaymentView(APIView):
    """Initiate Khalti payment for a booking"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Debug: Print incoming request data
        print("DEBUG - Incoming request data:", request.data)
        print("DEBUG - Content-Type:", request.content_type)
        
        # Validate booking_id is present
        booking_id = request.data.get("booking_id")
        if booking_id is None:
            return Response(
                {"error": "booking_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate booking_id is a valid integer
        try:
            booking_id = int(booking_id)
        except (TypeError, ValueError):
            return Response(
                {"error": "booking_id must be a valid integer"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if booking_id <= 0:
            return Response(
                {"error": "booking_id must be a positive integer"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the booking
        try:
            booking = Booking.objects.get(id=booking_id, family=request.user)
            print(f"DEBUG - Booking found: ID={booking.id}, status={booking.status}, total_amount={booking.total_amount}")
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found or you don't have permission to access it"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Booking must be accepted to allow payment
        if booking.status != "accepted":
            print(f"DEBUG - Booking status check failed: {booking.status} != accepted")
            return Response(
                {"error": f"Booking must be accepted before payment. Current status: {booking.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate total_amount
        if not booking.total_amount or float(booking.total_amount) <= 0:
            print(f"DEBUG - Total amount check failed: {booking.total_amount}")
            return Response(
                {"error": "Booking does not have a valid payment amount"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delete any existing pending Payment for this booking
        Payment.objects.filter(booking=booking, status="pending").delete()

        # Check if payment already exists and is completed
        try:
            existing_payment = Payment.objects.get(booking=booking)
            if existing_payment.status == "completed":
                return Response(
                    {"error": "Payment already completed for this booking"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Payment.DoesNotExist:
            pass  # No completed payment, will create new

        # Always create a new Payment record for this session
        payment = Payment.objects.create(
            booking=booking,
            amount=booking.total_amount or 0,
            status="pending"
        )

        # Amount in paisa (Khalti uses paisa, 1 NPR = 100 paisa)
        # Use round() to avoid floating point precision issues
        amount_in_paisa = int(round(float(payment.amount) * 100))
        print(f"DEBUG - Amount in paisa: {amount_in_paisa}")

        # Ensure URLs are valid absolute URLs with http/https
        frontend_url = settings.FRONTEND_URL.rstrip("/")
        if not frontend_url.startswith(("http://", "https://")):
            frontend_url = f"http://{frontend_url}"
        
        return_url = f"{frontend_url}/payment/verify"
        website_url = frontend_url

        print(f"DEBUG - return_url: {return_url}")
        print(f"DEBUG - website_url: {website_url}")

        # Prepare customer info with fallbacks
        customer_name = request.user.username or request.user.email or "Customer"
        customer_email = request.user.email or f"{request.user.username}@carenest.com"
        customer_phone = getattr(request.user, 'phone', None) or "9800000000"  # Fallback phone for testing

        # Khalti API payload
        payload = {
            "return_url": return_url,
            "website_url": website_url,
            "amount": amount_in_paisa,
            "purchase_order_id": f"booking_{booking.id}",
            "purchase_order_name": f"CareNest Booking #{booking.id}",
            "customer_info": {
                "name": customer_name,
                "email": customer_email,
                "phone": customer_phone,
            }
        }

        print(f"DEBUG - Khalti payload: {payload}")

        secret_key = getattr(settings, "KHALTI_SECRET_KEY", None)
        if not secret_key:
            return Response(
                {"error": "Khalti secret key not configured. Set KHALTI_SECRET_KEY in .env."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        headers = {
            "Authorization": f"Key {secret_key}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(
                "https://a.khalti.com/api/v2/epayment/initiate/",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            # Debug: Print raw response before parsing
            print(f"DEBUG - Khalti response status: {response.status_code}")
            print(f"DEBUG - Khalti response text: {response.text}")
            
            try:
                response_data = response.json()
            except ValueError:
                return Response(
                    {"error": "Invalid response from Khalti", "raw_response": response.text},
                    status=status.HTTP_502_BAD_GATEWAY
                )

            if response.status_code == 200:
                # Store the pidx for verification later
                payment.khalti_idx = response_data.get("pidx")
                payment.save()

                return Response({
                    "payment_url": response_data.get("payment_url"),
                    "pidx": response_data.get("pidx"),
                    "payment_id": payment.id,
                })
            elif response.status_code == 401:
                return Response(
                    {
                        "error": "Khalti authentication failed. Please check your secret key.",
                        "status_code": response.status_code,
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )
            else:
                # Extract Khalti error message for clear debugging
                khalti_error = response_data.get("detail") or response_data.get("error_key") or response_data
                return Response(
                    {
                        "error": "Khalti payment initiation failed",
                        "khalti_error": khalti_error,
                        "status_code": response.status_code,
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        except requests.RequestException as e:
            print(f"DEBUG - Request exception: {str(e)}")
            return Response(
                {"error": f"Payment service error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class VerifyKhaltiPaymentView(APIView):
    """Verify Khalti payment after redirect"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = KhaltiVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pidx = serializer.validated_data["pidx"]

        # Find payment by khalti_idx
        try:
            payment = Payment.objects.get(khalti_idx=pidx)
        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify with Khalti
        secret_key = getattr(settings, "KHALTI_SECRET_KEY", None)
        if not secret_key:
            return Response(
                {"error": "Khalti secret key not configured. Set KHALTI_SECRET_KEY in .env."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        headers = {
            "Authorization": f"Key {secret_key}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(
                "https://a.khalti.com/api/v2/epayment/lookup/",
                json={"pidx": pidx},
                headers=headers,
                timeout=30
            )
            response_data = response.json()

            if response.status_code == 200:
                khalti_status = response_data.get("status")
                
                if khalti_status == "Completed":
                    payment.status = "completed"
                    payment.transaction_id = response_data.get("transaction_id")
                    payment.save()

                    # Update booking status to paid
                    booking = payment.booking
                    booking.status = "paid"
                    booking.save()

                    return Response({
                        "message": "Payment verified successfully",
                        "payment": PaymentSerializer(payment).data,
                    })
                elif khalti_status == "Pending":
                    return Response({
                        "message": "Payment is still pending",
                        "status": "pending"
                    })
                else:
                    payment.status = "failed"
                    payment.save()
                    return Response(
                        {"error": f"Payment {khalti_status.lower()}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif response.status_code == 401:
                return Response(
                    {"error": "Khalti authentication failed. Please check your secret key.", "status_code": response.status_code},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            else:
                return Response(
                    {"error": "Failed to verify payment", "details": response_data},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except requests.RequestException as e:
            return Response(
                {"error": f"Payment verification error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class PaymentStatusView(APIView):
    """Get payment status for a booking"""
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.get(id=booking_id)
            # Check if user is authorized (either the family or caregiver)
            if booking.family != request.user and booking.caregiver != request.user:
                return Response(
                    {"error": "Not authorized"},
                    status=status.HTTP_403_FORBIDDEN
                )

            if hasattr(booking, "payment"):
                return Response(PaymentSerializer(booking.payment).data)
            else:
                return Response({"status": "no_payment"})
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found"},
                status=status.HTTP_404_NOT_FOUND
            )
