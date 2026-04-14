from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class Character(models.Model):
    class Gender(models.TextChoices):
        MALE = "M", "男"
        FEMALE = "F", "女"

    name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=Gender.choices)
    affiliation = models.CharField(max_length=150)
    homeland = models.CharField(max_length=150)
    occupation = models.CharField(max_length=150)
    element = models.CharField(max_length=100, blank=True, default="")
    first_appearance = models.CharField(max_length=200)
    description = models.TextField()
    vote_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "character"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class CharacterImage(models.Model):
    character = models.ForeignKey(
        Character,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="characters/")
    sort_order = models.PositiveSmallIntegerField(blank=True, null=True)

    class Meta:
        db_table = "character_image"
        ordering = ["sort_order", "id"]

    def clean(self) -> None:
        super().clean()

        if not self.character_id:
            return

        existing_images = CharacterImage.objects.filter(character_id=self.character_id)
        if self.pk:
            existing_images = existing_images.exclude(pk=self.pk)

        if existing_images.count() >= 3:
            raise ValidationError("每個角色最多只能上傳 3 張圖片。")

    def save(self, *args, **kwargs):
        # Auto-assign order within the same character when sort_order is not provided.
        if self.sort_order is None and self.character_id:
            max_order = (
                CharacterImage.objects.filter(character_id=self.character_id)
                .aggregate(models.Max("sort_order"))
                .get("sort_order__max")
            )
            self.sort_order = (max_order or 0) + 1
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.character.name} - Image {self.sort_order}"


class CharacterVote(models.Model):
    character = models.ForeignKey(
        Character,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    session_key = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "character_vote"
        constraints = [
            models.UniqueConstraint(
                fields=["character", "session_key"],
                name="uniq_character_vote_per_session",
            )
        ]

    def __str__(self) -> str:
        return f"{self.character.name} vote by {self.session_key}"


# Feedback model — stores visitor feedback submitted from the Contact page
class Feedback(models.Model):
    # Dropdown choices matching the site's main content sections
    class Category(models.TextChoices):
        CHARACTERS = "characters", "Characters"
        TIMELINE = "timeline", "Timeline"
        ELEMENTS = "elements", "Elements"
        WORLD = "world", "World"
        OTHER = "other", "Other"

    name = models.CharField(max_length=100)
    email = models.EmailField()
    category = models.CharField(max_length=20, choices=Category.choices)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.get_category_display()}] {self.name} ({self.created_at:%Y-%m-%d})"


class ElementSource(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True, default="")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "element_source"
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class ElementPower(models.Model):
    source = models.ForeignKey(
        ElementSource,
        on_delete=models.PROTECT,
        related_name="elements",
    )
    name = models.CharField(max_length=100)
    code = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True, default="")
    current_holder = models.ForeignKey(
        Character,
        on_delete=models.SET_NULL,
        related_name="current_element_powers",
        blank=True,
        null=True,
    )
    # Fallback display name for holders not yet created in Character table.
    current_holder_name = models.CharField(max_length=100, blank=True, default="")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "element_power"
        ordering = ["source__sort_order", "sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "name"],
                name="uniq_element_name_per_source",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if not self.current_holder and not self.current_holder_name.strip():
            raise ValidationError(
                "Please provide either current_holder or current_holder_name."
            )

    def __str__(self) -> str:
        return f"{self.name} ({self.source.name})"


class ElementHolderHistory(models.Model):
    element = models.ForeignKey(
        ElementPower,
        on_delete=models.CASCADE,
        related_name="holder_history",
    )
    character = models.ForeignKey(
        Character,
        on_delete=models.SET_NULL,
        related_name="element_holder_records",
        blank=True,
        null=True,
    )
    # Fallback holder name when Character record is not available yet.
    holder_name = models.CharField(max_length=100, blank=True, default="")
    start_label = models.CharField(max_length=120, blank=True, default="")
    end_label = models.CharField(max_length=120, blank=True, default="")
    is_current = models.BooleanField(default=False)
    note = models.TextField(blank=True, default="")
    sort_order = models.PositiveSmallIntegerField(blank=True, null=True)

    class Meta:
        db_table = "element_holder_history"
        ordering = ["element", "sort_order", "id"]
        constraints = [
            models.CheckConstraint(
                check=Q(character__isnull=False) | ~Q(holder_name=""),
                name="history_holder_character_or_name_required",
            ),
            models.UniqueConstraint(
                fields=["element"],
                condition=Q(is_current=True),
                name="uniq_current_holder_per_element",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if not self.character and not self.holder_name.strip():
            raise ValidationError("Please provide either character or holder_name.")
        if self.is_current and self.end_label.strip():
            raise ValidationError("Current holder should not have end_label.")

    def save(self, *args, **kwargs):
        # Auto-assign timeline order within each element.
        if self.sort_order is None and self.element_id:
            max_order = (
                ElementHolderHistory.objects.filter(element_id=self.element_id)
                .aggregate(models.Max("sort_order"))
                .get("sort_order__max")
            )
            self.sort_order = (max_order or 0) + 1
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        holder = self.character.name if self.character else self.holder_name
        return f"{self.element.name} - {holder}"
