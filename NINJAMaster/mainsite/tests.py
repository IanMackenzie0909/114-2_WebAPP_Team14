import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client, TestCase, override_settings

from .groq_assistant import (
    LOCAL_GUARD_MODEL,
    answer_ninjago_question,
    expand_timeline_query,
    get_character_aliases_for_question,
    is_first_spinjitzu_master_question,
    is_unsupported_detail_question,
)
from .models import (
    Character,
    CharacterImage,
    ElementPower,
    ElementSource,
    Feedback,
    WorldLocation,
)
from .timeline_data import build_timeline_payload, search_timeline_events


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

    def test_build_timeline_events_parses_markdown_sources(self):
        with TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "NINJAGOMastersofSpinjitzu.md"
            source.write_text(
                "\n".join(
                    [
                        "# ====== NINJAGO:Masters of Spinjitzu ======",
                        "## **時之戰（Battle for All of Time）**",
                        "- Acronix 與 Krux 背叛吳與伽瑪當。",
                        "- 雷與瑪雅打造時光之刃。",
                    ]
                ),
                encoding="utf-8",
            )

            payload = build_timeline_payload(source_files=[source])

        self.assertEqual(payload["event_count"], 1)
        self.assertEqual(len(payload["sources"]), 1)
        self.assertEqual(payload["events"][0]["title"], "時之戰（Battle for All of Time）")
        self.assertIn("Acronix", payload["events"][0]["keywords"])

    def test_timeline_event_search_finds_alias_text(self):
        events = [
            {
                "order": 2,
                "title": "其他事件",
                "search_text": "沒有相關角色",
            },
            {
                "order": 1,
                "title": "時之戰（Battle for All of Time）",
                "search_text": "Acronix 與 Krux 背叛吳與伽瑪當。",
            },
        ]

        results = search_timeline_events(events, "Acronix Krux")

        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "時之戰（Battle for All of Time）")

    def test_assistant_expands_common_aliases(self):
        expanded = expand_timeline_query("時間雙子是誰？")

        self.assertIn("Acronix", expanded)
        self.assertIn("Krux", expanded)

    def test_assistant_expands_first_spinjitzu_master_alias(self):
        expanded = expand_timeline_query("第一代旋風忍術大師做過哪些事情？")

        self.assertIn("第一旋風忍術大師", expanded)
        self.assertIn("First Spinjitzu Master", expanded)
        self.assertIn("國度水晶", expanded)

    def test_assistant_detects_first_spinjitzu_master_questions(self):
        self.assertTrue(is_first_spinjitzu_master_question("第一代旋風忍術大師做過哪些事情？"))
        self.assertTrue(is_first_spinjitzu_master_question("First Spinjitzu Master 做了什麼？"))
        self.assertFalse(is_first_spinjitzu_master_question("時間雙子是誰？"))

    def test_assistant_expands_character_aliases(self):
        nya_expanded = expand_timeline_query("赤蘭做過甚麼？")
        lloyd_expanded = expand_timeline_query("勞埃德做過哪些事？")

        self.assertIn("Nya", nya_expanded)
        self.assertIn("Lloyd", lloyd_expanded)
        self.assertEqual(get_character_aliases_for_question("赤蘭做過甚麼？"), ["赤蘭", "Nya"])
        self.assertEqual(get_character_aliases_for_question("勞埃德做過哪些事？"), ["勞埃德", "Lloyd"])

    def test_assistant_detects_unsupported_detail_questions(self):
        self.assertTrue(is_unsupported_detail_question("Lloyd 最喜歡吃什麼？"))
        self.assertTrue(is_unsupported_detail_question("Merge 發生的精確日期是哪一天？"))
        self.assertFalse(is_unsupported_detail_question("Merge 之後有哪些新元素？"))

    def test_assistant_local_guard_declines_unsupported_details(self):
        result = answer_ninjago_question("Nya 的身高是多少？")

        self.assertEqual(result["model"], LOCAL_GUARD_MODEL)
        self.assertEqual(result["context_count"], 0)
        self.assertIn("資料不足", result["answer"])

    @override_settings(ALLOWED_HOSTS=["testserver"])
    @patch.dict(os.environ, {}, clear=True)
    def test_ninjago_assistant_api_requires_groq_key(self):
        response = Client().post(
            "/api/ninjago/ask/",
            data=json.dumps({"question": "時間雙子是誰？"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"], "GROQ_API_KEY is not configured on the server.")

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
