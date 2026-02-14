# Sprint 3: optional notes on booking (PB-12)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="notes",
            field=models.TextField(blank=True, help_text="Optional notes from the care seeker"),
        ),
    ]
