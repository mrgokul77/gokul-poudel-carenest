from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0007_add_booking_lat_lng"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="check_in_time",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="check_out_time",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="proof_image",
            field=models.ImageField(blank=True, null=True, upload_to="booking_proofs/"),
        ),
        migrations.AlterField(
            model_name="booking",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("accepted", "Accepted"),
                    ("in_progress", "In Progress"),
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
