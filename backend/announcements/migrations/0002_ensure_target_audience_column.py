# Fixes DBs where announcements_announcement exists without target_audience
# (e.g. 0001 applied from an older migration snapshot).

from django.db import migrations


def add_target_audience_if_missing(apps, schema_editor):
    conn = schema_editor.connection
    if conn.vendor == "sqlite":
        with conn.cursor() as cursor:
            cursor.execute("PRAGMA table_info(announcements_announcement);")
            columns = [row[1] for row in cursor.fetchall()]
            if "target_audience" not in columns:
                cursor.execute(
                    "ALTER TABLE announcements_announcement "
                    "ADD COLUMN target_audience varchar(20) NOT NULL DEFAULT 'all';"
                )
    elif conn.vendor == "postgresql":
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'announcements_announcement'
                  AND column_name = 'target_audience';
                """
            )
            if cursor.fetchone() is None:
                cursor.execute(
                    "ALTER TABLE announcements_announcement "
                    "ADD COLUMN target_audience varchar(20) NOT NULL DEFAULT 'all';"
                )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("announcements", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_target_audience_if_missing, noop_reverse),
    ]
