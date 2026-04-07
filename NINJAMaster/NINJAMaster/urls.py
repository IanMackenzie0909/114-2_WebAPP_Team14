"""
URL configuration for NINJAMaster project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, re_path
from django.views.generic import TemplateView
from django.views.static import serve

from mainsite import views
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parents[2]

urlpatterns = [
    path("", TemplateView.as_view(template_name="index.html"), name="home"),
    path("index.html", TemplateView.as_view(template_name="index.html"), name="index-file"),
    path("src/timeline.html", TemplateView.as_view(template_name="timeline.html"), name="timeline-file"),
    path("src/world.html", TemplateView.as_view(template_name="world.html"), name="world-file"),
    path("src/elements.html", TemplateView.as_view(template_name="elements.html"), name="elements-file"),
    path("src/characters.html", views.characters_page, name="characters-file"),
    path("admin/", admin.site.urls),
    path("characters/", views.characters_page, name="characters"),
    path("characters/<int:character_id>/vote/", views.character_vote, name="character-vote"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static("css/", document_root=SITE_ROOT / "css")
    urlpatterns += static("img/", document_root=SITE_ROOT / "img")
    urlpatterns += static("action/", document_root=SITE_ROOT / "action")
    urlpatterns += [
        re_path(r"^style\.css$", serve, {"path": "style.css", "document_root": SITE_ROOT}),
        re_path(r"^script\.js$", serve, {"path": "script.js", "document_root": SITE_ROOT}),
    ]
