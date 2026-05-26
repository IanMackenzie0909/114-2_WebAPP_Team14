import json

from django.contrib.auth import login, logout
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import F, Prefetch
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST

from .groq_assistant import (
    GroqConfigurationError,
    GroqServiceError,
    answer_ninjago_question,
)
from .models import (
    Character,
    CharacterFavorite,
    CharacterImage,
    CharacterVote,
    ElementHolderHistory,
    ElementPower,
    Feedback,
    TimelineProgress,
    WorldLocation,
)
from .timeline_data import load_timeline_payload, search_timeline_events


def login_page(request):
    next_url = (request.POST.get("next") or request.GET.get("next") or "").strip()
    form = AuthenticationForm(request, data=request.POST or None)

    if request.user.is_authenticated:
        return render(
            request,
            "login.html",
            {
                "form": form,
                "next": next_url,
            },
        )

    if request.method == "POST" and form.is_valid():
        login(request, form.get_user())
        if next_url and url_has_allowed_host_and_scheme(
            url=next_url,
            allowed_hosts={request.get_host()},
            require_https=request.is_secure(),
        ):
            return redirect(next_url)
        return redirect("home")

    return render(
        request,
        "login.html",
        {
            "form": form,
            "next": next_url,
        },
    )


def register_page(request):
    if request.user.is_authenticated:
        return redirect("home")

    next_url = (request.POST.get("next") or request.GET.get("next") or "").strip()
    form = UserCreationForm(request.POST or None)

    if request.method == "POST" and form.is_valid():
        user = form.save()
        login(request, user)
        if next_url and url_has_allowed_host_and_scheme(
            url=next_url,
            allowed_hosts={request.get_host()},
            require_https=request.is_secure(),
        ):
            return redirect(next_url)
        return redirect("home")

    return render(
        request,
        "register.html",
        {
            "form": form,
            "next": next_url,
        },
    )


def logout_page(request):
    if request.method == "POST" and request.user.is_authenticated:
        logout(request)
    return redirect("login")


@ensure_csrf_cookie
def auth_status_api(request):
    user = request.user
    display_name = ""
    if user.is_authenticated:
        display_name = user.get_full_name() or user.get_username()

    return JsonResponse(
        {
            "ok": True,
            "authenticated": user.is_authenticated,
            "username": user.get_username() if user.is_authenticated else "",
            "display_name": display_name,
        }
    )


@ensure_csrf_cookie
def timeline_progress_api(request):
    if not request.user.is_authenticated:
        if request.method == "POST":
            return JsonResponse(
                {
                    "ok": False,
                    "login_required": True,
                },
                status=401,
            )

        return JsonResponse(
            {
                "ok": True,
                "authenticated": False,
                "items": {},
            }
        )

    if request.method == "GET":
        bookmark = TimelineProgress.objects.filter(user=request.user).order_by("-updated_at").first()
        bookmark_payload = None
        if bookmark:
            bookmark_payload = {
                "timeline_key": bookmark.timeline_key,
                "status": bookmark.status,
                "title": bookmark.title,
                "section_title": bookmark.section_title,
            }

        return JsonResponse(
            {
                "ok": True,
                "authenticated": True,
                "bookmark": bookmark_payload,
                "items": {bookmark.timeline_key: bookmark_payload} if bookmark else {},
            }
        )

    if request.method != "POST":
        return JsonResponse({"ok": False, "error": "Method not allowed."}, status=405)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    timeline_key = (data.get("timeline_key") or "").strip()
    status = (data.get("status") or "").strip()
    title = (data.get("title") or "").strip()
    section_title = (data.get("section_title") or "").strip()

    if not timeline_key:
        return JsonResponse({"ok": False, "error": "timeline_key is required."}, status=400)

    if status == "":
        TimelineProgress.objects.filter(user=request.user).delete()
        return JsonResponse(
            {
                "ok": True,
                "authenticated": True,
                "timeline_key": timeline_key,
                "status": "",
                "bookmark": None,
            }
        )

    if status not in TimelineProgress.Status.values:
        return JsonResponse({"ok": False, "error": "Invalid progress status."}, status=400)

    if not title:
        title = timeline_key

    TimelineProgress.objects.filter(user=request.user).exclude(timeline_key=timeline_key).delete()

    progress, _ = TimelineProgress.objects.update_or_create(
        user=request.user,
        timeline_key=timeline_key,
        defaults={
            "title": title[:220],
            "section_title": section_title[:160],
            "status": status,
        },
    )

    return JsonResponse(
        {
            "ok": True,
            "authenticated": True,
            "timeline_key": progress.timeline_key,
            "status": progress.status,
            "title": progress.title,
            "section_title": progress.section_title,
            "bookmark": {
                "timeline_key": progress.timeline_key,
                "status": progress.status,
                "title": progress.title,
                "section_title": progress.section_title,
            },
        }
    )


def timeline_events_api(request):
    try:
        payload = load_timeline_payload()
    except FileNotFoundError:
        return JsonResponse(
            {
                "ok": False,
                "error": "Timeline data has not been generated. Run build_timeline_events first.",
            },
            status=503,
        )

    query = (request.GET.get("q") or "").strip()
    try:
        limit = int(request.GET.get("limit") or "0")
    except ValueError:
        limit = 0

    events = search_timeline_events(payload.get("events", []), query)
    total_count = len(events)
    if limit > 0:
        events = events[:limit]

    return JsonResponse(
        {
            "ok": True,
            "schema_version": payload.get("schema_version"),
            "sources": payload.get("sources", []),
            "query": query,
            "count": len(events),
            "total_count": total_count,
            "events": events,
        },
        json_dumps_params={"ensure_ascii": False},
    )


@require_POST
def ninjago_assistant_api(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    question = (data.get("question") or "").strip()
    if not question:
        return JsonResponse({"ok": False, "error": "question is required."}, status=400)
    if len(question) > 500:
        return JsonResponse({"ok": False, "error": "question is too long."}, status=400)

    try:
        result = answer_ninjago_question(question)
    except FileNotFoundError:
        return JsonResponse(
            {
                "ok": False,
                "error": "Timeline data has not been generated. Run build_timeline_events first.",
            },
            status=503,
        )
    except GroqConfigurationError:
        return JsonResponse(
            {
                "ok": False,
                "error": "GROQ_API_KEY is not configured on the server.",
            },
            status=503,
        )
    except GroqServiceError as error:
        return JsonResponse(
            {
                "ok": False,
                "error": str(error),
            },
            status=502,
        )

    return JsonResponse({"ok": True, **result}, json_dumps_params={"ensure_ascii": False})


@login_required
def profile_page(request):
    favorite_characters = (
        Character.objects.filter(favorites__user=request.user)
        .prefetch_related(
            Prefetch(
                "images",
                queryset=CharacterImage.objects.order_by("sort_order", "id"),
            )
        )
        .order_by("name")
    )
    timeline_progress_items = TimelineProgress.objects.filter(user=request.user).order_by("-updated_at")[:1]

    return render(
        request,
        "profile.html",
        {
            "favorite_characters": favorite_characters,
            "timeline_progress_items": timeline_progress_items,
        },
    )


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
    favorite_character_ids = set()
    if request.user.is_authenticated:
        favorite_character_ids = set(
            CharacterFavorite.objects.filter(user=request.user).values_list("character_id", flat=True)
        )

    return render(
        request,
        "characters.html",
        {
            "characters": characters,
            "voted_character_ids": voted_character_ids,
            "favorite_character_ids": favorite_character_ids,
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


@require_POST
def character_favorite_toggle(request, character_id):
    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "login_required": True,
            },
            status=401,
        )

    character = get_object_or_404(Character, pk=character_id)
    favorite, created = CharacterFavorite.objects.get_or_create(
        user=request.user,
        character=character,
    )

    if created:
        is_favorited = True
    else:
        favorite.delete()
        is_favorited = False

    return JsonResponse(
        {
            "ok": True,
            "character_id": character.id,
            "favorited": is_favorited,
        }
    )


# ── Contact & Feedback ──────────────────────────────────────────────

# Render the contact page template (GET request)
@ensure_csrf_cookie
def contact_page(request):
    return render(request, "contact.html")


# API endpoint — accept feedback form submissions via POST
@require_POST
def submit_feedback(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    # Extract and validate required fields
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    category = (data.get("category") or "").strip()
    message = (data.get("message") or "").strip()

    errors = {}
    if not name:
        errors["name"] = "Name is required."
    if not email:
        errors["email"] = "Email is required."
    if category not in dict(Feedback.Category.choices):
        errors["category"] = "Please select a valid category."
    if not message:
        errors["message"] = "Feedback message is required."

    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    # Save feedback to database
    Feedback.objects.create(
        name=name,
        email=email,
        category=category,
        message=message,
    )

    return JsonResponse({"ok": True, "message": "Thank you for your feedback!"})


def element_powers_api(request):
    powers = (
        ElementPower.objects.select_related("source", "current_holder")
        .prefetch_related(
            Prefetch(
                "holder_history",
                queryset=ElementHolderHistory.objects.select_related("character").order_by(
                    "sort_order",
                    "id",
                ),
            )
        )
        .order_by("source__sort_order", "sort_order", "name")
    )

    payload = []
    for power in powers:
        current_holder = power.current_holder.name if power.current_holder else power.current_holder_name
        current_holder = (current_holder or "").strip()

        history_items = []
        for item in power.holder_history.all():
            holder_name = item.character.name if item.character else item.holder_name
            history_items.append(
                {
                    "character_id": item.character_id,
                    "holder": (holder_name or "").strip(),
                    "start_label": (item.start_label or "").strip(),
                    "end_label": (item.end_label or "").strip(),
                    "is_current": item.is_current,
                    "note": (item.note or "").strip(),
                }
            )

        payload.append(
            {
                "code": power.code,
                "name": power.name,
                "description": (power.description or "").strip(),
                "source_code": power.source.code,
                "source_name": power.source.name,
                "current_holder": current_holder,
                "history": history_items,
            }
        )

    return JsonResponse({"ok": True, "elements": payload})


def world_locations_api(request):
    locations = WorldLocation.objects.filter(is_published=True).order_by(
        "category",
        "sort_order",
        "name_zh",
    )
    return JsonResponse(
        {
            "ok": True,
            "locations": [location.to_card_payload() for location in locations],
        }
    )


def character_profile_api(request, character_id):
    character = get_object_or_404(
        Character.objects.prefetch_related(
            Prefetch(
                "images",
                queryset=CharacterImage.objects.order_by("sort_order", "id"),
            )
        ),
        pk=character_id,
    )

    images = [image.image.url for image in character.images.all()]
    return JsonResponse(
        {
            "ok": True,
            "character": {
                "id": character.id,
                "name": character.name,
                "gender": character.get_gender_display(),
                "affiliation": character.affiliation,
                "homeland": character.homeland,
                "occupation": character.occupation,
                "element": character.element,
                "first_appearance": character.first_appearance,
                "description": character.description,
                "images": images,
                "vote_count": character.vote_count,
            },
        }
    )
