from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0014_add_user_presence"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="push_token",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
