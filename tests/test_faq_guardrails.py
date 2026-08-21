import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
AGENT_DIR = REPO_ROOT / "agent"
if str(AGENT_DIR) not in sys.path:
    sys.path.append(str(AGENT_DIR))

from knowledge.faq_engine import (  # noqa: E402
    BANKING_SCOPE,
    OUT_OF_SCOPE,
    SMALL_TALK_SCOPE,
    answer_general_query,
    classify_query_scope,
    out_of_scope_message,
)


class FaqGuardrailTests(unittest.TestCase):
    def setUp(self) -> None:
        self.session = {
            "step": "identity",
            "sub_step": "awaiting_id",
            "product": "cash_finance",
            "region": "SA",
        }

    def test_small_talk_is_allowed_but_not_answered_by_faq(self) -> None:
        for message in ("hi", "hello", "how are you", "hy hello"):
            with self.subTest(message=message):
                scope = classify_query_scope(message, self.session)
                self.assertEqual(scope["scope"], SMALL_TALK_SCOPE)
                self.assertIsNone(answer_general_query(message, self.session))

    def test_banking_and_journey_questions_are_allowed(self) -> None:
        cases = {
            "what is cash finance?": "cash_finance_basics",
            "what documents do I need?": "documentation",
            "what is SIMAH?": "eligibility_requirements",
            "how do I switch voice mode?": "platform_support",
        }
        for message, expected_domain in cases.items():
            with self.subTest(message=message):
                scope = classify_query_scope(message, self.session)
                self.assertEqual(scope["scope"], BANKING_SCOPE)
                self.assertEqual(scope["domain"], expected_domain)

                answer = answer_general_query(message, self.session)
                self.assertIsNotNone(answer)
                self.assertEqual(answer["domain"], expected_domain)

    def test_irrelevant_questions_get_out_of_scope_fallback(self) -> None:
        fallback = out_of_scope_message()
        for message in ("what is Netflix?", "who is Virat Kohli?", "tell me a joke"):
            with self.subTest(message=message):
                scope = classify_query_scope(message, self.session)
                self.assertEqual(scope["scope"], OUT_OF_SCOPE)

                answer = answer_general_query(message, self.session)
                self.assertIsNotNone(answer)
                self.assertEqual(answer["domain"], OUT_OF_SCOPE)
                self.assertEqual(answer["text"], fallback)
                self.assertNotIn("Netflix", answer["text"])
                self.assertNotIn("Virat", answer["text"])
                self.assertNotIn("joke", answer["text"].lower())


if __name__ == "__main__":
    unittest.main()
