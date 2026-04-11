from django.contrib import admin

from notifications.models import PushToken


@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'push_token', 'updated_at']
    search_fields = ['user__email', 'push_token']
