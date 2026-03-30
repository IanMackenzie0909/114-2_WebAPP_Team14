from django.contrib import admin

from .models import Character, CharacterImage


class CharacterImageInline(admin.TabularInline):
    model = CharacterImage
    extra = 1
    max_num = 3
    fields = ("image", "sort_order")


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ("name", "gender", "affiliation", "element", "first_appearance")
    list_filter = ("gender", "affiliation", "element")
    search_fields = ("name", "affiliation", "homeland", "occupation", "element")
    inlines = [CharacterImageInline]


@admin.register(CharacterImage)
class CharacterImageAdmin(admin.ModelAdmin):
    list_display = ("character", "sort_order")
    list_filter = ("character",)
    search_fields = ("character__name",)
