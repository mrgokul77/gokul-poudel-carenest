from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0016_emergency_useractivity"),
    ]

    operations = [
        migrations.AddField(
            model_name="caregiverprofile",
            name="languages_spoken",
            field=models.JSONField(blank=True, default=list),
        ),
    ]