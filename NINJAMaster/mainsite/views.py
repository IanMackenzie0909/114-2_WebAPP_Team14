from django.db import transaction
from django.db.models import F, Prefetch
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST

from .models import Character, CharacterImage, CharacterVote


@ensure_csrf_cookie
def characters_page(request):
    if not request.session.session_key:
        request.session.save()

    session_key = request.session.session_key
    characters = (
        Character.objects.all()
        .prefetch_related(
            Prefetch(
                "images",
                queryset=CharacterImage.objects.order_by("sort_order", "id"),
            )
        )
        .order_by("name")
    )
    voted_character_ids = set(
        CharacterVote.objects.filter(session_key=session_key).values_list("character_id", flat=True)
    )
    return render(
        request,
        "characters.html",
        {
            "characters": characters,
            "voted_character_ids": voted_character_ids,
        },
    )


@require_POST
def character_vote(request, character_id):
    if not request.session.session_key:
        request.session.save()
    session_key = request.session.session_key

    character = get_object_or_404(Character, pk=character_id)

    with transaction.atomic():
        vote, created = CharacterVote.objects.get_or_create(
            character=character,
            session_key=session_key,
        )

        if created:
            Character.objects.filter(pk=character.pk).update(vote_count=F("vote_count") + 1)

    character.refresh_from_db(fields=["vote_count"])

    return JsonResponse(
        {
            "ok": True,
            "already_voted": not created,
            "character_id": character.id,
            "vote_count": character.vote_count,
        }
    )
