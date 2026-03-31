# Generated migration: simplify booking status (remove paid, scheduled)

from django.db import migrations, models


def migrate_paid_to_accepted(apps, schema_editor):
    """Convert any existing 'paid' bookings to 'accepted'."""
    Booking = apps.get_model("bookings", "Booking")
    Booking.objects.filter(status="paid").update(status="accepted")


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0005_add_completion_requested_status"),
    ]

    operations = [
        migrations.RunPython(migrate_paid_to_accepted, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="booking",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("accepted", "Accepted"),
                    ("completion_requested", "Completion Requested"),
                    ("completed", "Completed"),
                    ("rejected", "Declined"),
                    ("expired", "Expired"),
                ],
                default="pending",
                max_length=25,
            ),
        ),
    ]
