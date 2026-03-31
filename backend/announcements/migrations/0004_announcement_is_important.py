# Sync is_important with DBs that already have the column.

from django.db import migrations, models


def ensure_is_important_column(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        if conn.vendor == "sqlite":
            cursor.execute("PRAGMA table_info(announcements_announcement);")
            columns = [row[1] for row in cursor.fetchall()]
            if "is_important" not in columns:
                cursor.execute(
                    "ALTER TABLE announcements_announcement "
                    "ADD COLUMN is_important INTEGER NOT NULL DEFAULT 0;"
                )
        elif conn.vendor == "postgresql":
            cursor.execute(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'announcements_announcement'
                  AND column_name = 'is_important';
                """
            )
            if cursor.fetchone() is None:
                cursor.execute(
                    "ALTER TABLE announcements_announcement "
                    "ADD COLUMN is_important boolean NOT NULL DEFAULT false;"
                )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("announcements", "0003_announcement_is_active"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(ensure_is_important_column, noop_reverse),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="announcement",
                    name="is_important",
                    field=models.BooleanField(default=False),
                ),
            ],
        ),
    ]
