from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0008_booking_mobile_tracking_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="caregiver_latitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="caregiver_longitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="location_updated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
