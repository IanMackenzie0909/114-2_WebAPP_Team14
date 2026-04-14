import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("mainsite", "0006_feedback"),
    ]

    operations = [
        migrations.CreateModel(
            name="ElementSource",
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
                ("name", models.CharField(max_length=100, unique=True)),
                ("code", models.SlugField(max_length=50, unique=True)),
                ("description", models.TextField(blank=True, default="")),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={
                "db_table": "element_source",
                "ordering": ["sort_order", "name"],
            },
        ),
        migrations.CreateModel(
            name="ElementPower",
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
                ("name", models.CharField(max_length=100)),
                ("code", models.SlugField(max_length=50, unique=True)),
                ("description", models.TextField(blank=True, default="")),
                (
                    "current_holder_name",
                    models.CharField(blank=True, default="", max_length=100),
                ),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                (
                    "current_holder",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="current_element_powers",
                        to="mainsite.character",
                    ),
                ),
                (
                    "source",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="elements",
                        to="mainsite.elementsource",
                    ),
                ),
            ],
            options={
                "db_table": "element_power",
                "ordering": ["source__sort_order", "sort_order", "name"],
            },
        ),
        migrations.CreateModel(
            name="ElementHolderHistory",
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
                ("holder_name", models.CharField(blank=True, default="", max_length=100)),
                ("start_label", models.CharField(blank=True, default="", max_length=120)),
                ("end_label", models.CharField(blank=True, default="", max_length=120)),
                ("is_current", models.BooleanField(default=False)),
                ("note", models.TextField(blank=True, default="")),
                ("sort_order", models.PositiveSmallIntegerField(blank=True, null=True)),
                (
                    "character",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="element_holder_records",
                        to="mainsite.character",
                    ),
                ),
                (
                    "element",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="holder_history",
                        to="mainsite.elementpower",
                    ),
                ),
            ],
            options={
                "db_table": "element_holder_history",
                "ordering": ["element", "sort_order", "id"],
            },
        ),
        migrations.AddConstraint(
            model_name="elementpower",
            constraint=models.UniqueConstraint(
                fields=("source", "name"),
                name="uniq_element_name_per_source",
            ),
        ),
        migrations.AddConstraint(
            model_name="elementholderhistory",
            constraint=models.CheckConstraint(
                condition=models.Q(character__isnull=False)
                | ~models.Q(holder_name=""),
                name="history_holder_character_or_name_required",
            ),
        ),
        migrations.AddConstraint(
            model_name="elementholderhistory",
            constraint=models.UniqueConstraint(
                condition=models.Q(is_current=True),
                fields=("element",),
                name="uniq_current_holder_per_element",
            ),
        ),
    ]
