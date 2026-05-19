from django.conf import settings
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


class CharacterFavorite(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="character_favorites",
    )
    character = models.ForeignKey(
        Character,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "character_favorite"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "character"],
                name="uniq_character_favorite_per_user",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} favorite {self.character.name}"


class WorldLocation(models.Model):
    class Category(models.TextChoices):
        REALM = "realm", "世界"
        KINGDOM_LAND = "kingdom_land", "國度"
        CITY_SETTLEMENT = "city_settlement", "城市/聚落"
        ISLAND = "island", "島嶼"
        LANDMARK = "landmark", "重要地標"

    name_zh = models.CharField(max_length=120)
    name_en = models.CharField(max_length=160, blank=True, default="")
    category = models.CharField(max_length=24, choices=Category.choices)
    short_description = models.TextField()
    long_description = models.TextField()
    image = models.ImageField(upload_to="world/", blank=True, null=True)
    image_description = models.CharField(max_length=240, blank=True, default="")
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "world_location"
        ordering = ["category", "sort_order", "name_zh"]

    @property
    def category_label(self) -> str:
        return self.get_category_display()

    def to_card_payload(self) -> dict:
        return {
            "id": self.id,
            "nameZh": self.name_zh,
            "nameEn": self.name_en,
            "category": self.category,
            "categoryLabel": self.category_label,
            "shortDescription": self.short_description,
            "longDescription": self.long_description,
            "image": self.image.url if self.image else "",
            "imageDescription": self.image_description,
        }

    def __str__(self) -> str:
        if self.name_en:
            return f"{self.name_zh} ({self.name_en})"
        return self.name_zh


class TimelineProgress(models.Model):
    class Status(models.TextChoices):
        BOOKMARKED = "bookmarked", "Bookmarked"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="timeline_progress",
    )
    timeline_key = models.CharField(max_length=160)
    title = models.CharField(max_length=220)
    section_title = models.CharField(max_length=160, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "timeline_progress"
        ordering = ["section_title", "title"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                name="uniq_timeline_bookmark_per_user",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} {self.timeline_key} {self.status}"


# Feedback model — stores visitor feedback submitted from the Contact page
class Feedback(models.Model):
    # Dropdown choices matching the site's main content sections
    class Category(models.TextChoices):
        CHARACTERS = "characters", "Characters"
        TIMELINE = "timeline", "Timeline"
        ELEMENTS = "elements", "Elements"
        WORLD = "world", "World"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        NEW = "new", "New"
        REVIEWED = "reviewed", "Reviewed"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=100)
    email = models.EmailField()
    category = models.CharField(max_length=20, choices=Category.choices)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    admin_note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
                condition=Q(character__isnull=False) | ~Q(holder_name=""),
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
