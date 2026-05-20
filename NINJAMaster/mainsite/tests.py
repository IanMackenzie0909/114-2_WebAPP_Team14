import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from .models import (
    Character,
    CharacterImage,
    ElementPower,
    ElementSource,
    Feedback,
    WorldLocation,
)


class InitialContentCommandTests(TestCase):
    def test_seed_initial_content_loads_default_records(self):
        call_command("seed_initial_content", verbosity=0)

        User = get_user_model()

        self.assertEqual(Character.objects.count(), 14)
        self.assertEqual(CharacterImage.objects.count(), 42)
        self.assertEqual(ElementSource.objects.count(), 7)
        self.assertEqual(ElementPower.objects.count(), 7)
        self.assertEqual(WorldLocation.objects.count(), 12)
        self.assertEqual(Feedback.objects.count(), 0)
        self.assertEqual(User.objects.count(), 0)

    def test_reset_content_removes_user_generated_feedback(self):
        Feedback.objects.create(
            name="Maintainer",
            email="maintainer@example.com",
            category=Feedback.Category.OTHER,
            message="Keep me around.",
        )

        call_command("seed_initial_content", reset_content=True, verbosity=0)

        self.assertEqual(Feedback.objects.count(), 0)
        self.assertFalse(Feedback.objects.filter(name="Maintainer").exists())


class FeedbackModelTests(TestCase):
    def test_feedback_defaults_to_new_status(self):
        feedback = Feedback.objects.create(
            name="Kai",
            email="kai@example.com",
            category=Feedback.Category.CHARACTERS,
            message="More fire content please.",
        )

        self.assertEqual(feedback.status, Feedback.Status.NEW)
        self.assertEqual(feedback.admin_note, "")


class EnsureSuperuserCommandTests(TestCase):
    def test_ensure_superuser_creates_admin_from_environment(self):
        env = {
            "DJANGO_SUPERUSER_USERNAME": "admin",
            "DJANGO_SUPERUSER_PASSWORD": "change-me",
            "DJANGO_SUPERUSER_EMAIL": "admin@example.com",
        }

        with patch.dict(os.environ, env, clear=True):
            call_command("ensure_superuser", verbosity=0)

        User = get_user_model()
        user = User.objects.get(username="admin")
        self.assertEqual(user.email, "admin@example.com")
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password("change-me"))

    def test_ensure_superuser_requires_username_and_password_together(self):
        env = {
            "DJANGO_SUPERUSER_USERNAME": "admin",
        }

        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(CommandError):
                call_command("ensure_superuser", verbosity=0)
