from django.contrib import admin

from .models import (
    Character,
    CharacterImage,
    CharacterVote,
    ElementHolderHistory,
    ElementPower,
    ElementSource,
    Feedback,
)


class CharacterImageInline(admin.TabularInline):
    model = CharacterImage
    extra = 1
    max_num = 3
    fields = ("image", "sort_order")


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ("name", "gender", "affiliation", "element", "first_appearance", "vote_count")
    list_filter = ("gender", "affiliation", "element")
    search_fields = ("name", "affiliation", "homeland", "occupation", "element")
    inlines = [CharacterImageInline]


@admin.register(CharacterImage)
class CharacterImageAdmin(admin.ModelAdmin):
    list_display = ("character", "sort_order")
    list_filter = ("character",)
    search_fields = ("character__name",)


@admin.register(CharacterVote)
class CharacterVoteAdmin(admin.ModelAdmin):
    list_display = ("character", "session_key", "created_at")
    list_filter = ("character", "created_at")
    search_fields = ("character__name", "session_key")


# Feedback admin — allows reviewing visitor feedback in the Django admin panel
@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "category", "created_at")
    list_filter = ("category", "created_at")
    search_fields = ("name", "email", "message")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)


class ElementHolderHistoryInline(admin.TabularInline):
    model = ElementHolderHistory
    extra = 1
    fields = (
        "character",
        "holder_name",
        "start_label",
        "end_label",
        "is_current",
        "sort_order",
        "note",
    )
    autocomplete_fields = ("character",)


@admin.register(ElementSource)
class ElementSourceAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "sort_order")
    list_editable = ("sort_order",)
    search_fields = ("name", "code", "description")
    ordering = ("sort_order", "name")


@admin.register(ElementPower)
class ElementPowerAdmin(admin.ModelAdmin):
    list_display = ("name", "source", "current_holder", "current_holder_name", "sort_order")
    list_filter = ("source",)
    search_fields = ("name", "code", "description", "current_holder__name", "current_holder_name")
    list_select_related = ("source", "current_holder")
    list_editable = ("sort_order",)
    autocomplete_fields = ("source", "current_holder")
    inlines = [ElementHolderHistoryInline]


@admin.register(ElementHolderHistory)
class ElementHolderHistoryAdmin(admin.ModelAdmin):
    list_display = ("element", "character", "holder_name", "is_current", "start_label", "end_label", "sort_order")
    list_filter = ("is_current", "element__source")
    search_fields = ("element__name", "character__name", "holder_name", "note")
    list_select_related = ("element", "character", "element__source")
    autocomplete_fields = ("element", "character")
