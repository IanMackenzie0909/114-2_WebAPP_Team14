# Generated manually because Django is not installed in the current shell.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("mainsite", "0012_feedback_admin_note_feedback_status_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="WorldLocation",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name_zh", models.CharField(max_length=120)),
                (
                    "name_en",
                    models.CharField(blank=True, default="", max_length=160),
                ),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("realm", "世界"),
                            ("kingdom_land", "國度"),
                            ("city_settlement", "城市/聚落"),
                            ("island", "島嶼"),
                            ("landmark", "重要地標"),
                        ],
                        max_length=24,
                    ),
                ),
                ("short_description", models.TextField()),
                ("long_description", models.TextField()),
                (
                    "image",
                    models.ImageField(blank=True, null=True, upload_to="world/"),
                ),
                (
                    "image_description",
                    models.CharField(blank=True, default="", max_length=240),
                ),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("is_published", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "world_location",
                "ordering": ["category", "sort_order", "name_zh"],
            },
        ),
    ]
