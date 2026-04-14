from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0017_caregiverprofile_languages_spoken"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="caregiverprofile",
            name="languages_spoken",
        ),
    ]