from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0009_booking_live_location_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="rejection_reason",
            field=models.TextField(blank=True, null=True),
        ),
    ]
