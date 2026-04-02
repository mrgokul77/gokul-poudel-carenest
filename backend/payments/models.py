from django.db import models
from django.conf import settings

# links a payment to a booking - tracks money exchanged for caregiving services
class Payment(models.Model):
	amount = models.DecimalField(max_digits=10, decimal_places=2)
	status = models.CharField(
		max_length=20,
		choices=[
			("pending", "Pending"),
			("completed", "Completed"),
			("failed", "Failed"),
			("refunded", "Refunded"),
		],
		default="pending",
	)
	transaction_id = models.CharField(max_length=255, blank=True, null=True)
	khalti_token = models.CharField(max_length=255, blank=True, null=True)
	khalti_idx = models.CharField(max_length=255, blank=True, null=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	# Link to the related booking
	booking = models.OneToOneField(
		'bookings.Booking',
		on_delete=models.CASCADE,
		related_name='payment'
	)
	# Caregiver who receives the payment
	caregiver = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name='payments_received',
		blank=True,
		null=True
	)
	# Careseeker who makes the payment
	careseeker = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name='payments_made',
		blank=True,
		null=True
	)
	payment_date = models.DateTimeField(blank=True, null=True)
	payment_method = models.CharField(max_length=50, default='Khalti')
	payment_status = models.CharField(max_length=20, default='Pending')

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return f"Payment {self.id} - {self.status}"

