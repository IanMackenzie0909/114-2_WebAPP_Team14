from django.core.management.base import BaseCommand

from mainsite.timeline_data import DEFAULT_OUTPUT_FILE, write_timeline_payload


class Command(BaseCommand):
    help = "Build structured timeline event data from the Markdown source files."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            default=str(DEFAULT_OUTPUT_FILE),
            help="Destination JSON file for generated timeline events.",
        )

    def handle(self, *args, **options):
        output_path, payload = write_timeline_payload(output_file=options["output"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Wrote {payload['event_count']} timeline events to {output_path}."
            )
        )
