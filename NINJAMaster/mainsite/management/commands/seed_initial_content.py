from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from mainsite.models import (
    Character,
    CharacterFavorite,
    CharacterImage,
    CharacterVote,
    ElementHolderHistory,
    ElementPower,
    ElementSource,
    Feedback,
    TimelineProgress,
    WorldLocation,
)


class Command(BaseCommand):
    help = "Load the default Ninjago Archive content fixture."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-content",
            action="store_true",
            help="Delete existing content and related user progress before loading the fixture.",
        )

    def handle(self, *args, **options):
        if options["reset_content"]:
            self.stdout.write("Resetting existing content records...")
            with transaction.atomic():
                TimelineProgress.objects.all().delete()
                CharacterFavorite.objects.all().delete()
                CharacterVote.objects.all().delete()
                Feedback.objects.all().delete()
                ElementHolderHistory.objects.all().delete()
                ElementPower.objects.all().delete()
                ElementSource.objects.all().delete()
                WorldLocation.objects.all().delete()
                CharacterImage.objects.all().delete()
                Character.objects.all().delete()

        call_command("loaddata", "initial_content")
        self.stdout.write(self.style.SUCCESS("Initial content is ready."))
