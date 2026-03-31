# Sync is_active with DBs that already have the column (added outside repo migrations)
# and add the column when missing.

from django.db import migrations, models


def ensure_is_active_column(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        if conn.vendor == "sqlite":
            cursor.execute("PRAGMA table_info(announcements_announcement);")
            columns = [row[1] for row in cursor.fetchall()]
            if "is_active" not in columns:
                cursor.execute(
                    "ALTER TABLE announcements_announcement "
                    "ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;"
                )
        elif conn.vendor == "postgresql":
            cursor.execute(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'announcements_announcement'
                  AND column_name = 'is_active';
                """
            )
            if cursor.fetchone() is None:
                cursor.execute(
                    "ALTER TABLE announcements_announcement "
                    "ADD COLUMN is_active boolean NOT NULL DEFAULT true;"
                )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("announcements", "0002_ensure_target_audience_column"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(ensure_is_active_column, noop_reverse),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="announcement",
                    name="is_active",
                    field=models.BooleanField(default=True),
                ),
            ],
        ),
    ]
