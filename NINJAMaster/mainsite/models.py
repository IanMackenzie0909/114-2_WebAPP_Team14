from django.core.exceptions import ValidationError
from django.db import models


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
