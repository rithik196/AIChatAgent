import ast
from html import escape
import logging
from pathlib import Path
import re
from typing import Any
import unittest
from unittest.mock import Mock


REPO_ROOT = Path(__file__).resolve().parents[1]
ACCEPTANCE_TEXT = "Commodity ownership has been legally transferred to you! Your Commodity Transaction Certificate and Contract Letter have been generated. Please review both documents and proceed with E-signing via Emdha for final archival."


def load_functions(path, names, scope):
    source = ast.parse((REPO_ROOT / path).read_text(encoding="utf-8-sig"))
    functions = [node for node in source.body if isinstance(node, ast.FunctionDef) and node.name in names]
    if len(functions) != len(names):
        raise AssertionError(f"Missing production functions in {path}")
    exec(compile(ast.Module(body=functions, type_ignores=[]), path, "exec"), scope)


class MurabahaEsignTests(unittest.TestCase):
    def setUp(self):
        self.scope = {
            "Any": Any,
            "StreamingResponse": dict,
            "logger": logging.getLogger(__name__),
            "re": re,
            "_sync_customer_routing_fields": Mock(),
            "_resolve_india_spoken_signal": Mock(return_value=None),
            "_extract_prefixed_json_payload": Mock(return_value=None),
            "_store_gateway_session": Mock(),
            "_ensure_commodity_certificate_pdf": Mock(return_value="/api/chat/generated-documents/CommodityCertificate_test.pdf"),
            "_build_personal_widget_data": lambda session, session_id: session.get("customer_profile", {}),
            "_get_mail_recipient": lambda session, email: email,
            "send_docusign_email": Mock(return_value=True),
            "_stream_widget_response": lambda text, widget, flags: {"text": text, "widget": widget, "flags": flags},
        }
        load_functions("agent/extractors/router.py", {"_is_india_personal_session", "_advance_session_state"}, self.scope)
        load_functions("backend/api/chat.py", {
            "_get_docusign_template", "_send_docusign_for_session", "_is_widget_event",
            "_resolve_step_tracker", "resolve_widget", "_handle_widget_event",
        }, self.scope)
        load_functions("agent/graph/nodes.py", {"_deterministic_classify", "_contains_phrase", "_fast_state_response"}, self.scope)
        self.session = {
            "region": "SA", "step": "trade", "sub_step": "murabaha_sale",
            "finance_summary": {"amount": 73170, "total_payable": 85080, "tenure": 60},
            "customer_profile": {"name": "Test Customer", "email": "customer@example.invalid"},
        }

    def event(self, signal):
        return self.scope["_handle_widget_event"](self.session, "test", f"__SYS__{signal}", signal)

    def test_mid_journey_tracker_mappings_preserve_ntb_and_etb_totals(self):
        cases = (
            ("trade", "promise", 3), ("trade", "bank_purchase", 3),
            ("trade", "murabaha_sale", 3), ("trade", "authorize", 3),
            ("trade", "certificate", 3), ("trade", "contract_prompt", 3),
            ("esign", "documents", 4), ("esign", "wakalah_prompt", 4),
            ("esign", "promissory_documents", 4), ("disburse", "account", 5),
        )
        for customer_type, journey_mode in (("NTB", "NTB_ENRICHMENT"), ("ETB", "ETB_CORE"), ("ETB", "NTB_ENRICHMENT")):
            session = {"region": "SA", "customerType": customer_type, "journeyMode": journey_mode}
            for step, sub_step, expected in cases:
                with self.subTest(customer_type=customer_type, journey_mode=journey_mode, state=(step, sub_step)):
                    tracker = self.scope["_resolve_step_tracker"](step, sub_step, customer_type, session)
                    self.assertEqual(tracker, {"show_step_tracker": True, "tracker_step": expected, "tracker_total": 5})
            preapproved = self.scope["_resolve_step_tracker"]("offer", "pre_approved_offer", customer_type, session)
            self.assertEqual(preapproved["tracker_step"], 1 if customer_type == "ETB" else 2)

    def test_mid_journey_widget_payloads_include_tracker_without_changing_finance(self):
        cases = (
            ("trade", "promise", "PromiseToPurchaseWidget", 3),
            ("trade", "bank_purchase", "BankCommodityBuyWidget", 3),
            ("trade", "murabaha_sale", "MurabahaSaleExecutionWidget", 3),
            ("trade", "certificate", "DocumentPreviewWidget", 3),
            ("trade", "contract_prompt", "GenerateContractWidget", 3),
            ("esign", "documents", "DocumentPreviewWidget", 4),
            ("esign", "wakalah_prompt", "WakalahConsentWidget", 4),
            ("esign", "promissory_documents", "DocumentPreviewWidget", 4),
            ("disburse", "account", "AccountSelectorWidget", 5),
        )
        self.scope["get_etb_registered_ibans"] = Mock(return_value=[])
        finance_before = dict(self.session["finance_summary"])
        for customer_type, journey_mode in (("NTB", "NTB_ENRICHMENT"), ("ETB", "ETB_CORE"), ("ETB", "NTB_ENRICHMENT")):
            for step, sub_step, expected_widget, expected_step in cases:
                with self.subTest(customer_type=customer_type, journey_mode=journey_mode, state=(step, sub_step)):
                    session = {
                        **self.session, "step": step, "sub_step": sub_step,
                        "customerType": customer_type, "journeyMode": journey_mode,
                        "murabaha_sale_accepted": dict(finance_before),
                        "commodity_sale": {"amount": 73170, "total_payable": 85080, "consented": True},
                    }
                    widget = self.scope["resolve_widget"](session, None)
                    self.assertEqual(widget["widget"], expected_widget)
                    data = widget["data"]
                    self.assertTrue(data["show_step_tracker"])
                    self.assertEqual(data["tracker_step"], expected_step)
                    self.assertEqual(data["tracker_total"], 5)
                    self.assertEqual(session["finance_summary"], finance_before)
                    if sub_step in {"promise", "bank_purchase", "murabaha_sale", "wakalah_prompt"}:
                        self.assertEqual(data["amount"], 73170)
                    if sub_step in {"certificate", "documents", "promissory_documents"}:
                        self.assertEqual(data["current_step"], 3 if sub_step == "certificate" else 4)

    def test_loaders_stay_untracked_and_signing_completions_stay_silent(self):
        for step, sub_step in (("trade", "loading"), ("trade", "success"), ("esign", "email_sent"), ("esign", "promissory_email_sent")):
            with self.subTest(state=(step, sub_step)):
                session = {**self.session, "step": step, "sub_step": sub_step, "murabaha_sale_accepted": True, "commodity_sale": {"amount": 73170}}
                tracker = self.scope["_resolve_step_tracker"](step, sub_step, "NTB", session)
                self.assertFalse(tracker["show_step_tracker"])
                widget = self.scope["resolve_widget"](session, None)
                self.assertFalse(widget["data"].get("show_step_tracker", False))
                if step == "esign":
                    self.assertTrue(widget["data"]["silent"])
                    self.assertNotIn("completion_visible_text", widget["data"])

    def test_india_tracker_overrides_and_legacy_documents_remain_unchanged(self):
        for step, sub_step in (("trade", "promise"), ("esign", "wakalah_prompt"), ("esign", "promissory_documents")):
            tracker = self.scope["_resolve_step_tracker"](step, sub_step, "NTB", {"region": "IN"})
            self.assertFalse(tracker["show_step_tracker"])
        self.scope["_INDIA_WIDGET_UNHANDLED"] = object()
        india_override = {"widget": "IndiaPreApprovedOfferWidget", "data": {"show_step_tracker": True, "tracker_step": 2, "tracker_total": 5, "tracker_variant": "check"}}
        self.scope["_resolve_india_widget"] = Mock(return_value=india_override)
        self.assertIs(self.scope["resolve_widget"]({"region": "IN", "step": "offer", "sub_step": "pre_approved_offer"}, None), india_override)
        legacy = self.scope["resolve_widget"]({"region": "SA", "step": "esign", "sub_step": "documents"}, None)
        self.assertEqual(legacy["data"]["tracker_step"], 4)
        self.assertEqual(legacy["data"]["tracker_total"], 5)
        self.assertEqual([document["name"] for document in legacy["data"]["documents"]], ["Contract Letter", "Promissory Note"])

    def authorize_sale(self):
        self.event("accept_murabaha_sale")
        self.event("proceed_esign")
        self.event("esign_email_complete")
        self.scope["send_docusign_email"].reset_mock()
        return self.event("authorize_commodity_sale")

    def test_acceptance_shows_two_existing_documents_without_sending_email(self):
        result = self.event("accept_murabaha_sale")
        self.assertEqual(result["text"], ACCEPTANCE_TEXT)
        self.assertEqual((self.session["step"], self.session["sub_step"]), ("esign", "documents"))
        documents = result["widget"]["data"]["documents"]
        self.assertEqual(len(documents), 2)
        self.assertIn("generated-documents/CommodityCertificate_test.pdf", documents[0]["url"])
        self.assertEqual(documents[1]["url"], "/assets/ContractSaudi.pdf")
        self.assertNotIn("Promissory", str(result))
        self.scope["send_docusign_email"].assert_not_called()

    def test_invalid_finance_or_generation_failure_stays_retryable(self):
        self.session["finance_summary"]["amount"] = 0
        self.event("accept_murabaha_sale")
        self.assertEqual(self.session["sub_step"], "murabaha_sale")
        self.session["finance_summary"]["amount"] = 73170
        self.scope["_ensure_commodity_certificate_pdf"].side_effect = RuntimeError("PDF unavailable")
        self.event("accept_murabaha_sale")
        self.assertEqual(self.session["sub_step"], "murabaha_sale")
        self.assertNotIn("murabaha_sale_accepted", self.session)

    def test_signing_email_is_contract_only_and_sent_once(self):
        self.event("accept_murabaha_sale")
        result = self.event("proceed_esign")
        self.scope["send_docusign_email"].assert_called_once_with(
            "customer@example.invalid", "Test Customer", template="murabaha_contract", region="SA",
        )
        self.assertEqual(result["widget"]["widget"], "LoadingWidget")
        self.assertEqual(result["widget"]["data"]["auto_advance_ms"], 15000)
        self.assertNotIn("completion_visible_text", result["widget"]["data"])
        self.event("proceed_esign")
        self.scope["_send_docusign_for_session"](self.session, "test")
        self.assertEqual(self.scope["send_docusign_email"].call_count, 1)

    def test_failed_or_missing_email_does_not_start_loader(self):
        self.event("accept_murabaha_sale")
        self.scope["send_docusign_email"].return_value = False
        result = self.event("proceed_esign")
        self.assertEqual(self.session["sub_step"], "documents")
        self.assertEqual(result["widget"]["widget"], "DocumentPreviewWidget")
        self.session["customer_profile"].pop("email")
        self.scope["send_docusign_email"].reset_mock()
        self.event("proceed_esign")
        self.scope["send_docusign_email"].assert_not_called()

    def test_completion_stops_at_wakalah_without_consent_or_account_widget(self):
        self.event("accept_murabaha_sale")
        self.event("proceed_esign")
        result = self.event("esign_email_complete")
        self.assertEqual((self.session["step"], self.session["sub_step"]), ("esign", "wakalah_prompt"))
        self.assertEqual(result["widget"]["widget"], "WakalahConsentWidget")
        self.assertEqual(result["widget"]["data"], {
            "amount": 73170, "show_step_tracker": True, "tracker_step": 4, "tracker_total": 5,
        })
        self.assertIn("successfully signed and archived", result["text"])
        self.assertIn("appointing the bank/broker as your agent (Wakalah)", result["flags"]["postText"])
        self.assertIn("on the open market", result["flags"]["postText"])
        self.assertTrue(result["flags"]["postTextBeforeWidget"])
        self.event("continue")
        self.assertEqual(self.session["sub_step"], "wakalah_prompt")
        self.assertNotIn("wakalah_consent", self.session)

    def test_agent_acceptance_and_completion_match_gateway_states(self):
        extracted = self.scope["_deterministic_classify"](
            "I accept the Murabaha sale and transfer of ownership.", "trade", "murabaha_sale", self.session,
        )
        self.scope["_advance_session_state"](extracted, self.session)
        self.assertEqual(self.scope["_fast_state_response"](self.session), ACCEPTANCE_TEXT)
        self.scope["_advance_session_state"]({"data": {"proceed_esign": True}}, self.session)
        self.assertEqual(self.session["sub_step"], "email_sent")
        self.scope["_advance_session_state"]({"data": {"esign_email_complete": True}}, self.session)
        self.assertEqual(self.session["sub_step"], "wakalah_prompt")

    def test_sale_response_has_dynamic_proceeds_and_separate_deferred_total(self):
        result = self.authorize_sale()
        self.assertIn("independent broker DDCAP for 73,170 SAR", result["text"])
        self.assertIn("deferred total of 85,080 SAR", result["flags"]["postText"])
        self.assertTrue(result["flags"]["postTextBeforeWidget"])
        self.assertEqual(self.session["sub_step"], "promissory_documents")
        self.assertTrue(self.session["commodity_sale"]["consented"])
        self.assertTrue(self.session["commodity_sale"]["simulated"])
        self.assertEqual(result["widget"]["widget"], "DocumentPreviewWidget")
        documents = result["widget"]["data"]["documents"]
        self.assertEqual(documents, [{"name": "Promissory Note", "type": "pdf", "url": "/assets/PromissoryNote.pdf"}])
        self.assertNotIn("reference", result["widget"]["data"])
        self.scope["send_docusign_email"].assert_not_called()

    def test_modified_finance_values_are_not_replaced_by_screenshot_amounts(self):
        self.session["finance_summary"] = {"amount": 91234.75, "total_payable": 100000.25, "tenure": 36}
        result = self.authorize_sale()
        self.assertIn("91,234.75 SAR", result["text"])
        self.assertIn("100,000.25 SAR", result["flags"]["postText"])

    def test_sale_requires_correct_stage_explicit_authorization_and_valid_finance(self):
        self.event("authorize_commodity_sale")
        self.assertNotIn("commodity_sale", self.session)
        self.event("accept_murabaha_sale")
        self.event("proceed_esign")
        self.event("esign_email_complete")
        self.event("continue")
        self.assertNotIn("commodity_sale", self.session)
        self.session["finance_summary"]["total_payable"] = 1
        self.event("authorize_commodity_sale")
        self.assertNotIn("commodity_sale", self.session)
        self.assertEqual(self.session["sub_step"], "wakalah_prompt")

    def test_promissory_signing_is_independent_from_contract_and_idempotent(self):
        self.authorize_sale()
        self.assertTrue(self.session["docusign_email_sent"])
        result = self.event("proceed_esign")
        self.scope["send_docusign_email"].assert_called_once_with(
            "customer@example.invalid", "Test Customer", template="promissory_note", region="SA",
        )
        self.assertEqual(self.session["sub_step"], "promissory_email_sent")
        self.assertEqual(result["widget"]["data"]["auto_advance_ms"], 15000)
        self.assertEqual(result["widget"]["data"]["next_message"], "promissory_esign_complete")
        self.assertNotIn("completion_visible_text", result["widget"]["data"])
        self.event("proceed_esign")
        self.scope["_send_docusign_for_session"](self.session, "test")
        self.assertEqual(self.scope["send_docusign_email"].call_count, 1)

    def test_note_email_failure_keeps_document_retryable(self):
        self.authorize_sale()
        self.scope["send_docusign_email"].return_value = False
        result = self.event("proceed_esign")
        self.assertEqual(self.session["sub_step"], "promissory_documents")
        self.assertEqual(result["widget"]["widget"], "DocumentPreviewWidget")
        self.assertNotIn("promissory_email_sent", self.session)
        self.event("promissory_esign_complete")
        self.assertEqual(self.session["sub_step"], "promissory_documents")
        self.scope["send_docusign_email"].return_value = True
        self.event("proceed_esign")
        self.assertEqual(self.session["sub_step"], "promissory_email_sent")

    def test_final_note_completion_shows_confirmation_then_account_prompt(self):
        self.authorize_sale()
        self.event("proceed_esign")
        self.event("esign_email_complete")
        self.assertEqual(self.session["sub_step"], "promissory_email_sent")
        result = self.event("promissory_esign_complete")
        self.assertEqual((self.session["step"], self.session["sub_step"]), ("disburse", "account"))
        self.assertIn("Ministry of Justice Nafith platform", result["text"])
        self.assertEqual(result["flags"]["postText"], "Next, please select the account that should be credited with your approved funds of 73,170 SAR.")
        self.assertTrue(result["flags"]["postTextBeforeWidget"])
        self.assertEqual(result["widget"]["widget"], "AccountSelectorWidget")
        self.assertTrue(self.session["promissory_esign_simulated_complete"])

    def test_agent_sale_and_note_states_match_gateway(self):
        self.event("accept_murabaha_sale")
        self.event("proceed_esign")
        self.event("esign_email_complete")
        for text, sub_step in (
            ("I authorize the sale of the commodity on my behalf.", "promissory_documents"),
            ("__SYS__proceed_esign", "promissory_email_sent"),
            ("__SYS__promissory_esign_complete", "account"),
        ):
            extracted = self.scope["_deterministic_classify"](text, self.session["step"], self.session["sub_step"], self.session)
            self.scope["_advance_session_state"](extracted, self.session)
            self.assertEqual(self.session["sub_step"], sub_step)

    def test_email_html_and_legacy_templates_remain_distinct(self):
        scope = {
            "escape": escape,
            "DEFAULT_DOCUSIGN_SIGNER_EMAIL": "signer@example.invalid",
            "_build_docusign_link": lambda name, email, document, transaction, page: f"https://sign.example.invalid/{document}",
        }
        load_functions("backend/services/mail.py", {"_build_docusign_email"}, scope)
        contract = scope["_build_docusign_email"]("Test <Customer>", contract_only=True)
        self.assertEqual(contract["mailBody"].count("href="), 1)
        self.assertIn("ContractSaudi", contract["mailBody"])
        self.assertIn("Test &lt;Customer&gt;", contract["mailBody"])
        self.assertNotIn("Promissory", contract["mailBody"])
        self.assertNotIn("CommodityCertificate", contract["mailBody"])
        legacy = scope["_build_docusign_email"]("Test Customer")
        self.assertEqual(legacy["mailBody"].count("href="), 2)
        self.assertIn("PromissoryNote", legacy["mailBody"])
        self.assertEqual(self.scope["_get_docusign_template"]({"region": "SA"}), "default")
        self.assertEqual(self.scope["_get_docusign_template"]({"region": "IN", "murabaha_sale_accepted": True}), "preapproved")

    def test_mail_service_dispatches_contract_only_payload(self):
        client = Mock()
        client.post.return_value = Mock(status_code=200, text="ok")
        httpx = Mock()
        httpx.Client.return_value.__enter__ = Mock(return_value=client)
        httpx.Client.return_value.__exit__ = Mock(return_value=False)
        scope = {
            "Any": Any,
            "escape": escape,
            "logger": logging.getLogger(__name__),
            "httpx": httpx,
            "CONSENT_PORTAL_BASE_URL": "https://mail.example.invalid",
            "CONSENT_PORTAL_EMAIL_PATH": "/send",
            "DEFAULT_DOCUSIGN_SIGNER_EMAIL": "signer@example.invalid",
            "_log_email_request": Mock(),
            "_build_docusign_link": lambda name, email, document, transaction, page: f"https://sign.example.invalid/{document}",
        }
        load_functions("backend/services/mail.py", {"_build_docusign_email", "_build_promissory_note_email", "send_docusign_email"}, scope)
        self.assertTrue(scope["send_docusign_email"]("customer@example.invalid", "Test Customer", template="murabaha_contract"))
        payload = client.post.call_args.kwargs["json"]
        self.assertEqual(payload["mailTo"], "customer@example.invalid")
        self.assertEqual(payload["mailBody"].count("href="), 1)
        self.assertIn("ContractSaudi", payload["mailBody"])
        self.assertNotIn("Promissory", payload["mailBody"])
        self.assertTrue(scope["send_docusign_email"]("customer@example.invalid", "Test <Customer>", template="promissory_note"))
        note_payload = client.post.call_args.kwargs["json"]
        self.assertEqual(note_payload["mailBody"].count("href="), 1)
        self.assertIn("PromissoryNote", note_payload["mailBody"])
        self.assertNotIn("ContractSaudi", note_payload["mailBody"])
        self.assertIn("Test &lt;Customer&gt;", note_payload["mailBody"])


if __name__ == "__main__":
    unittest.main()