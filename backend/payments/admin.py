from django.contrib import admin
from .models import Payment

# Admin configuration for Payment model
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "booking", "amount", "status", "transaction_id", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["booking__id", "transaction_id", "khalti_idx"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]
