# Generated manually for booking rules

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0003_alter_booking_status'),
    ]

    operations = [
        migrations.AlterField(
            model_name='booking',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('accepted', 'Accepted'),
                    ('rejected', 'Rejected'),
                    ('expired', 'Expired'),
                    ('paid', 'Paid'),
                    ('completed', 'Completed'),
                ],
                default='pending',
                max_length=10,
            ),
        ),
    ]
