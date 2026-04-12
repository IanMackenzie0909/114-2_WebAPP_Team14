from django.contrib import admin

from .models import Character, CharacterImage, CharacterVote, Feedback


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
