"""
Chat API gateway — proxies to LangGraph agent (port 8001),
handles session management, widget resolution, and SSE streaming.
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import httpx
import json
import time
import math
import random
import re
import logging

from db import get_customer_by_phone, get_customer_by_national_id, update_customer, get_etb_customer_profile, get_etb_registered_ibans
from services.mail import send_open_banking_email
from backend.utils.eligibility import calculate_max_eligible_amount

router = APIRouter()
logger = logging.getLogger(__name__)

AGENT_URL = "http://localhost:8001"

# ── In-memory session store (backed by agent persistence) ────────────
SESSION_STORE: dict[str, dict] = {}


def _get_phone_from_session_id(session_id: str) -> str:
    """Session IDs are formatted as '<phone>_<product>' for this app."""
    return session_id.split("_", 1)[0] if session_id else ""


def _customer_to_widget_data(customer: Any) -> dict:
    """Map backend CustomerProfile model into the widget's expected payload shape."""
    def _address_to_widget_data(address: Any) -> dict:
        if not address:
            return {}
        return {
            "line1": address.line1,
            "line2": address.line2,
            "street": address.street,
            "city": address.city,
            "postalCode": address.postal_code,
            "houseType": address.house_type,
        }

    return {
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "personal": {
            "idNumber": customer.personal.id_number,
            "idExpirationDate": customer.personal.id_expiration_date or "26/08/2027",
            "nationality": customer.personal.nationality,
            "levelOfEducation": customer.personal.education,
            "maritalStatus": customer.personal.marital_status,
            "dependents": customer.personal.dependents,
        },
        "address": _address_to_widget_data(customer.address),
        "employment": {
            "type": customer.employment.type,
            "industry": customer.employment.industry,
            "employer": customer.employment.employer,
            "experience": customer.employment.experience,
            "workAddress": _address_to_widget_data(customer.employment.work_address),
        },
        "income": {
            "monthly": customer.income.monthly,
            "obligations": customer.income.obligations,
            "creditCardLimit": customer.income.credit_card_limit,
        },
    }


def _merge_widget_profile(base: Any, overlay: Any) -> dict:
    """Merge session profile data over a complete customer snapshot without dropping untouched fields."""
    def _clone(value: Any):
        if isinstance(value, dict):
            return {k: _clone(v) for k, v in value.items()}
        if isinstance(value, list):
            return [_clone(v) for v in value]
        return value

    def _merge_dicts(left: dict, right: dict) -> dict:
        result = {k: _clone(v) for k, v in left.items()}
        for key, value in right.items():
            if isinstance(value, dict):
                existing = result.get(key)
                if isinstance(existing, dict):
                    result[key] = _merge_dicts(existing, value)
                elif value:
                    result[key] = _merge_dicts({}, value)
            elif value not in (None, ""):
                result[key] = value
        return result

    base_dict = base if isinstance(base, dict) else {}
    overlay_dict = overlay if isinstance(overlay, dict) else {}
    return _merge_dicts(base_dict, overlay_dict)


def _build_personal_widget_data(session: dict) -> dict:
    """Build a full personal-details payload by combining the live session with persisted customer data."""
    complete_profile: dict[str, Any] = {}
    national_id = session.get("collected", {}).get("id_number", "")
    if national_id:
        customer = get_customer_by_national_id(national_id)
        if customer:
            complete_profile = _customer_to_widget_data(customer)

    return _merge_widget_profile(complete_profile, session.get("customer_profile"))


def _build_application_summary_data(session: dict) -> dict:
    profile = _build_personal_widget_data(session)
    collected = session.get("collected", {})
    finance = session.get("finance_summary", {})
    account = session.get("selected_account", {})
    customer_type = session.get("customerType") or ("ETB" if session.get("user_type") == "existing" else "NTB")

    if customer_type == "ETB" and not account.get("iban"):
        national_id = collected.get("id_number", "")
        registered_ibans = get_etb_registered_ibans(national_id) if national_id else []
        if registered_ibans:
            account = registered_ibans[0]

    # Ensure bank/beneficiary are populated from IBAN master when only IBAN is present.
    if account.get("iban") and (not account.get("bank") or not account.get("beneficiary")):
        try:
            from backend.utils.eligibility import validate_iban
            iban_lookup = validate_iban(account.get("iban", ""))
            if iban_lookup.get("valid"):
                if not account.get("bank"):
                    account["bank"] = iban_lookup.get("bank", "")
                if not account.get("beneficiary"):
                    account["beneficiary"] = iban_lookup.get("beneficiary", "")
        except Exception:
            logger.exception("Failed to derive account details from IBAN for application summary.")

    personal = profile.get("personal", {})
    return {
        "personalDetails": {
            "name": profile.get("name") or collected.get("full_name") or "Customer",
            "idNumber": personal.get("idNumber") or collected.get("id_number", "****"),
            "phone": profile.get("phone") or collected.get("phone_number") or "+966 ***",
        },
        "financeSummary": {
            "amount": finance.get("amount", 0),
            "tenure": finance.get("tenure", 60),
            "profit_rate": finance.get("profit_rate", "12%"),
            "monthly_installment": finance.get("monthly_installment", 0),
            "total_payable": finance.get("total_payable", 0),
        },
        "account": {
            "bank": account.get("bank", "Unknown"),
            "iban": account.get("iban", ""),
            "beneficiary": account.get("beneficiary", ""),
        },
        "is_etb": customer_type == "ETB",
    }


# ── Helpers ──────────────────────────────────────────────────────────

def resolve_widget(session: dict, extract: dict | None) -> dict | None:
    """Map step+sub_step to widget type + data payload."""
    step = session.get("step", "identity")
    sub_step = session.get("sub_step", "")
    customer_type = session.get("customerType") or ("ETB" if session.get("user_type") == "existing" else "NTB")
    journey_mode = session.get("journeyMode", "PRE_DEDUPE")

    if step == "identity" and sub_step == "nafath_pending":
        return {"widget": "NafathWidget", "data": {"nafath_code": session.get("nafath_code", math.floor(10 + random.random() * 89))}}

    if step == "identity" and sub_step == "loading":
        return {"widget": "LoadingWidget", "data": {"title": "Verifying OTP...", "subtitle": "Processing your secure request", "auto_advance_ms": 3000, "next_message": "loading_complete", "silent": True}}

    if step == "identity" and sub_step == "verified":
        return {"widget": "VerificationSuccessWidget", "data": {"title": "OTP Verified", "subtitle": "Your identity has been verified.", "auto_advance_ms": 3000, "next_message": "continue", "silent": True}}

    if step == "identity" and sub_step == "dedupe_check":
        return {"widget": "LoadingWidget", "data": {"title": "Running Dedupe Check...", "subtitle": "Verifying your records", "auto_advance_ms": 3000, "next_message": "dedupe_complete", "silent": True}}

    if step == "identity" and sub_step == "identify_yourself":
        if customer_type == "ETB" and journey_mode != "NTB_ENRICHMENT":
            return None
        return {"widget": "NTBIntroductionWidget", "data": {}}

    if step == "identity" and sub_step == "personal_details":
        if customer_type == "ETB" and journey_mode != "NTB_ENRICHMENT":
            return None
        return {
            "widget": "PersonalDetailsWidget",
            "data": _build_personal_widget_data(session) or {
                "name": "Customer",
                "phone": "",
                "email": "",
                "personal": {
                    "idNumber": session.get("collected", {}).get("id_number", ""),
                    "idExpirationDate": "26/08/2027",
                    "nationality": "KSA",
                    "levelOfEducation": "",
                    "maritalStatus": "",
                    "dependents": "",
                },
                "address": {
                    "line1": "",
                    "line2": "",
                    "street": "",
                    "city": "",
                    "postalCode": "",
                    "houseType": ""
                },
                "employment": {
                    "type": "",
                    "industry": "",
                    "employer": "",
                    "experience": "",
                    "workAddress": {
                        "line1": "",
                        "street": "",
                        "city": "",
                        "postalCode": "",
                        "houseType": ""
                    }
                },
                "income": {
                    "monthly": "",
                    "obligations": "",
                    "creditCardLimit": ""
                }
            }
        }

    if step == "identity" and sub_step == "modify_section":
        return {"widget": "ModifySectionWidget", "data": {}}

    if step == "identity" and sub_step == "modify_personal":
        return {"widget": "ModifyPersonalWidget", "data": session.get("customer_profile") or {}}

    if step == "identity" and sub_step == "modify_address":
        return {"widget": "ModifyAddressWidget", "data": session.get("customer_profile") or {}}

    if step == "identity" and sub_step == "modify_employment":
        return {"widget": "ModifyEmploymentWidget", "data": session.get("customer_profile") or {}}

    if step == "identity" and sub_step == "modify_income":
        return {"widget": "ModifyIncomeWidget", "data": session.get("customer_profile") or {}}

    if step == "identity" and sub_step == "updating_details":
        updating = session.get("updating", {})
        return {
            "widget": "UpdatingWidget",
            "data": {
                "section": updating.get("section", "Details"),
                "auto_advance_ms": updating.get("auto_advance_ms", 3000),
                "next_message": updating.get("next_message", "update_complete"),
                "silent": updating.get("silent", True),
            },
        }

    if step == "identity" and sub_step == "expenses":
        return {
            "widget": "ExpensesWidget",
            "data": {
                "prefilled": bool(session.get("expenses_prefilled")),
                "totalExpenses": session.get("expenses_total", 7560),
            },
        }

    if step == "identity" and sub_step == "bureau_consent":
        return {"widget": "BureauConsentWidget", "data": {}}

    if step == "identity" and sub_step == "eligibility_check":
        return {"widget": "LoadingWidget", "data": {"title": "Initiating eligibility check for you", "subtitle": "Running due diligence and regulatory checks", "auto_advance_ms": 3000, "next_message": "eligibility_check_complete", "silent": True}}

    if step == "offer" and sub_step == "pre_approved_offer":
        offer = session.get("offer", {})
        customer_id = session.get("collected", {}).get("id_number", "")
        etb_profile = get_etb_customer_profile(customer_id)
        max_amount = offer.get("max_amount")
        if max_amount is None:
            eligibility_result = calculate_max_eligible_amount(
                monthly_income=etb_profile.get("monthly_income", 35650),
                monthly_obligations=etb_profile.get("monthly_obligations", 8750),
                credit_card_limit=etb_profile.get("credit_card_limit", 20000),
                tenure_months=etb_profile.get("preferred_tenure_months", 60),
                region=session.get("region", "SA"),
            )
            max_amount = eligibility_result.get("max_amount") or eligibility_result.get("estimated_amount", 0)
            session.setdefault("offer", {})
            session["offer"].update({
                "max_amount": max_amount,
                "profit_rate": "12%",
                "max_tenure": etb_profile.get("preferred_tenure_months", 60),
            })
        return {
            "widget": "PreApprovedOfferWidget",
            "data": {
                "title": "Your Pre-Approved Offer",
                "max_amount": max_amount,
                "profit_rate": "12%",
                "max_tenure": offer.get("max_tenure", etb_profile.get("preferred_tenure_months", 60)),
            },
        }

    if step == "offer" and sub_step == "eligible":
        offer = session.get("offer", {})
        
        # A2c: ETB pre-approved amounts calculated via formula (not hardcoded)
        if customer_type == "ETB" and journey_mode == "ETB_CORE":
            customer_id = session.get("collected", {}).get("id_number", "")
            etb_profile = get_etb_customer_profile(customer_id)
            
            # Use same formula as NTB eligibility calculation
            eligibility_result = calculate_max_eligible_amount(
                monthly_income=etb_profile.get("monthly_income", 35650),
                monthly_obligations=etb_profile.get("monthly_obligations", 8750),
                credit_card_limit=etb_profile.get("credit_card_limit", 20000),
                tenure_months=etb_profile.get("preferred_tenure_months", 60),
                region=session.get("region", "SA")
            )
            
            max_amount = offer.get("max_amount") or eligibility_result.get("estimated_amount", 0)
            
            return {
                "widget": "EligibleOfferWidget",
                "data": {
                    "title": "Your Pre-Approved Offer",
                    "max_amount": max_amount,
                    "profit_rate": eligibility_result.get("profit_rate", "12%"),
                    "max_tenure": etb_profile.get("preferred_tenure_months", 60),
                    "is_etb": True,
                    "pre_approval_badge": "✓ PRE-APPROVED",
                },
            }
        
        # NTB: Use existing offer from session (already calculated)
        return {
            "widget": "EligibleOfferWidget",
            "data": {
                "title": "Eligible Finance Offer",
                "max_amount": offer.get("max_amount", 350000),
                "profit_rate": offer.get("profit_rate", "12%"),
                "max_tenure": offer.get("max_tenure", 60),
                "is_etb": False,
            },
        }

    if step == "offer" and sub_step == "wants_more_decision":
        return {
            "widget": "WantsMoreDecisionWidget",
            "data": {
                "maxAmount": session.get("offer", {}).get("max_amount", 0),
            },
        }

    if step == "offer" and sub_step == "wants_more_open_banking":
        return {
            "widget": "LoadingWidget",
            "data": {
                "title": "Open Banking Verification",
                "subtitle": "Linking your account and updating your profile...",
                "auto_advance_ms": 4500,
                "next_message": "open_banking_linked",
                "silent": True,
            },
        }

    if step == "offer" and sub_step == "wants_more_backoffice":
        return {
            "widget": "BackofficeWorkitemWidget",
            "data": {
                "workitem": session.get("backoffice_workitem", {}),
            },
        }

    if step == "disburse" and sub_step == "account":
        # A3: ETB gets pre-registered IBANs from IBAN Master (Excel)
        if journey_mode == "ETB_CORE":
            customer_id = session.get("collected", {}).get("id_number", "")
            registered_ibans = get_etb_registered_ibans(customer_id)
            
            return {
                "widget": "AccountSelectorWidget",
                "data": {
                    "accounts": registered_ibans,
                    "show_manual_entry": True,
                    "pre_select_default": True,  # Auto-select is_default=true account
                    "is_etb": True,
                },
            }
        
        # NTB: Empty list + manual entry
        return {
            "widget": "AccountSelectorWidget",
            "data": {
                "accounts": [],
                "show_manual_entry": True,
                "pre_select_default": False,
                "is_etb": False,
            },
        }

    if step == "disburse" and sub_step == "iban_validation":
        from backend.utils.eligibility import validate_iban
        iban = session.get("selected_account", {}).get("iban", "")
        validation_result = validate_iban(iban)
        return {
            "widget": "IBANValidationWidget",
            "data": {
                "iban": iban,
                "bank": validation_result.get("bank", "Unknown Bank"),
                "beneficiary": validation_result.get("beneficiary", ""),
                "valid": validation_result.get("valid", False),
                "reason": validation_result.get("reason", "Validation failed"),
            },
        }

    if step == "disburse" and sub_step == "application_summary":
        return {
            "widget": "ApplicationSummaryWidget",
            "data": _build_application_summary_data(session),
        }

    if step == "disburse" and sub_step in {"ivr_consent", "otp_entry"}:
        return {
            "widget": "FinalIVRConsentWidget",
            "data": {},
        }

    if step == "disburse" and sub_step == "otp_verifying":
        return {
            "widget": "LoadingWidget",
            "data": {
                "title": "Verifying OTP...",
                "subtitle": "Checking the 6-digit code you entered in chat.",
                "auto_advance_ms": 3000,
                "next_message": "otp_verification_complete",
                "silent": True,
            },
        }

    if step == "disburse" and sub_step == "ivr_requested":
        return {
            "widget": "LoadingWidget",
            "data": {
                "title": "IVR Request Started",
                "subtitle": "Please verify the details through the incoming call.",
                "auto_advance_ms": 10000,
                "next_message": "ivr_verification_complete",
                "silent": True,
            },
        }

    if step == "disburse" and sub_step in {"otp_success", "ivr_success"}:
        return {
            "widget": "VerificationSuccessWidget",
            "data": {
                "title": "OTP Verification Successful" if sub_step == "otp_success" else "IVR Verification Successful",
                "subtitle": "Your identity verification is complete. We are preparing the final disbursement screen.",
                "auto_advance_ms": 3000,
                "next_message": "complete_disbursement",
                "silent": True,
            },
        }

    if step == "offer" and sub_step == "slider":
        offer = session.get("offer", {})
        return {
            "widget": "OfferSliderWidget",
            "data": {
                "max_amount": offer.get("max_amount", 250000),
                "min_amount": 5000,
                "profit_rate": offer.get("profit_rate", "12%"),
                "default_tenure": 36,
            },
        }

    if step == "offer" and sub_step == "summary":
        return {
            "widget": "FinanceSummaryWidget",
            "data": session.get("finance_summary") or {},
        }

    if step == "trade" and sub_step == "authorize":
        return {"widget": "CommodityTradeAuthorizationWidget", "data": {}}

    if step == "trade" and sub_step == "loading":
        return {"widget": "LoadingWidget", "data": {"title": "Executing Commodity Trade...", "subtitle": "Processing your Murabaha transaction", "auto_advance_ms": 3000, "next_message": "loading_complete", "silent": True}}

    if step == "trade" and sub_step == "success":
        return {"widget": "VerificationSuccessWidget", "data": {"title": "Commodity Trade Successful", "subtitle": "Your Murabaha transaction has been completed.", "auto_advance_ms": 3000, "next_message": "trade_certificate_ready", "silent": True}}

    if step == "trade" and sub_step == "certificate":
        return {
            "widget": "DocumentPreviewWidget",
            "data": {
                "title": "Commodity Transaction Certificate",
                "subtitle": "Generated and ready to download",
                "current_step": 3,
                # UI no longer shows an in-widget proceed button; chat will prompt the user.
                "documents": [{"name": "Commodity Transaction Certificate", "type": "pdf", "url": "/assets/Letter.pdf"}],
            },
        }

    if step == "esign" and sub_step == "documents":
        return {
            "widget": "DocumentPreviewWidget",
            "data": {
                "documents": [
                    {"name": "Contract Letter", "type": "pdf", "url": "/assets/Letter.pdf"},
                    {"name": "Promissory Note", "type": "pdf", "url": "/assets/Letter.pdf"},
                ],
                "title": "Contract & Promissory Note",
                "subtitle": "Ready for E-Sign",
                "current_step": 4,
                # proceed/send actions are handled by chat confirmations
            },
        }

    if step == "esign" and sub_step == "email_sent":
        return {
            "widget": "LoadingWidget",
            "data": {
                "title": "E-Sign Email Sent",
                "subtitle": "Please complete the signature from your email. We will continue once it is verified.",
                "auto_advance_ms": 5000,
                "next_message": "esign_email_complete",
                "silent": True,
            },
        }

    if step == "esign" and sub_step == "otp_ivr":
        return {"widget": "OtpVerificationWidget", "data": {}}

    if step == "disburse" and sub_step == "account":
        return {
            "widget": "AccountSelectorWidget",
            "data": {
                "accounts": [
                    {"type": "Current Account", "iban": "SA89 2980 0000 9090 5454 5001", "bank": "FIRST ABU DHABI BANK"},
                    {"type": "Savings Account", "iban": "SA89 2980 0000 9090 5454 5002", "bank": "FIRST ABU DHABI BANK"},
                ],
            },
        }

    if step == "done":
        finance = session.get("finance_summary") or {}
        profile = _build_personal_widget_data(session)
        selected_account = session.get("selected_account", {})
        customer_name = profile.get("name") or session.get("collected", {}).get("full_name") or "Customer"
        return {
            "widget": "DisbursementWidget",
            "data": session.get("disbursement", {
                "customer_name": customer_name,
                "reference": "PF-2025-XXXXXXXX",
                "date": time.strftime("%d %B %Y"),
                "amount": finance.get("amount", 0),
                "account": selected_account.get("iban", "Current Account ****1234"),
                "tenure": f"{finance.get('tenure', 0)} Months",
                "profit_rate": finance.get("profit_rate", ""),
                "first_installment": "03 July 2025",
                "monthly_installment": finance.get("monthly_installment", 0),
                "total_payable": finance.get("total_payable", 0),
                "bank": selected_account.get("bank", ""),
                "beneficiary": selected_account.get("beneficiary", ""),
            }),
        }

    return None


# ── SSE stream builder (AI SDK v6 UIMessageStream protocol) ─────────

def _build_sse_stream(response_text: str, widget_spec: dict | None, ui_flags: dict | None = None):
    """Generate SSE events in AI SDK v6 UIMessageStream protocol."""
    msg_id = f"msg_{int(time.time()*1000)}_{random.randint(1000,9999)}"
    text_part_id = f"text_{int(time.time()*1000)}_{random.randint(1000,9999)}"

    def _event(data: str) -> str:
        return f"data: {data}\n\n"

    yield _event(json.dumps({"type": "start", "messageId": msg_id}))
    yield _event(json.dumps({"type": "start-step"}))
    yield _event(json.dumps({"type": "text-start", "id": text_part_id}))

    # Stream text in ~20 char chunks
    chunks = re.findall(r".{1,20}", response_text) or [response_text]
    for chunk in chunks:
        yield _event(json.dumps({"type": "text-delta", "id": text_part_id, "delta": chunk}))

    yield _event(json.dumps({"type": "text-end", "id": text_part_id}))

    metadata: dict[str, Any] = {}
    if widget_spec:
        metadata["widget"] = widget_spec
    if ui_flags:
        metadata.update(ui_flags)
    if metadata:
        yield _event(json.dumps({"type": "message-metadata", "messageMetadata": metadata}))

    yield _event(json.dumps({"type": "finish-step"}))
    yield _event(json.dumps({"type": "finish"}))
    yield "data: [DONE]\n\n"


# ── Request models ───────────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]]

class UpdateCustomerRequest(BaseModel):
    session_id: str
    national_id: str
    updated_data: Dict[str, Any]

class OpenBankingEmailRequest(BaseModel):
    session_id: str
    email: str
    name: str

class SendOpenBankingEmailRequest(BaseModel):
    session_id: str
    email: str
    name: str


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(request: ChatRequest):
    session_id = request.session_id
    last_user_msg = (request.messages[-1].get("content", "") if request.messages else "").strip()

    # Get or create session
    current_session = SESSION_STORE.get(session_id)
    if not current_session:
        current_session = {
            "region": "SA",
            "step": "identity",
            "sub_step": "awaiting_id",
            "step_number": 1,
            "total_steps": 5,
            "product": "cash_finance",
            "user_type": "unknown",
            "customerType": "UNKNOWN",
            "journeyMode": "PRE_DEDUPE",
            "journeyOrigin": "UNKNOWN",
            "transitionReason": None,
            "collected": {},
            "offer": {},
            "finance_summary": {},
            "disbursement": {},
            "_lastWidgetState": "identity/awaiting_id",
        }
        SESSION_STORE[session_id] = current_session

    # Quick-path: accept any 6-digit OTP during esign otp step and advance to disbursement account
    if last_user_msg and re.fullmatch(r"\d{6}", last_user_msg):
        sub = current_session.get("sub_step", "")
        if current_session.get("step") == "esign" and sub == "otp_ivr":
            # Treat entered 6-digit as successful verification (no real-time backend OTP required)
            current_session["step"] = "disburse"
            current_session["sub_step"] = "account"
            SESSION_STORE[session_id] = current_session

            # Return an immediate SSE response with the account selector widget
            widget_spec = resolve_widget(current_session, None)
            response_text = "OTP verification successful. Proceeding to disbursement account selection."
            return StreamingResponse(
                _build_sse_stream(response_text, widget_spec),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "x-vercel-ai-ui-message-stream": "v1",
                },
            )

    # Call agent
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{AGENT_URL}/invoke",
            json={
                "session_id": session_id,
                "messages": request.messages,
                "session": current_session,
            },
        )
        if resp.status_code != 200:
            return StreamingResponse(
                iter([f"data: {json.dumps({'type': 'error', 'error': resp.text})}\n\n"]),
                media_type="text/event-stream",
            )
        data = resp.json()

    # Update session
    updated_session = data.get("session", current_session)

    # Attach DB-backed customer profile only when needed.
    # This avoids repeated DB round-trips on every chat turn.
    need_profile = (
        updated_session.get("step") == "identity"
        and updated_session.get("sub_step") == "personal_details"
        and not updated_session.get("customer_profile")
    )
    if need_profile:
        national_id = updated_session.get("collected", {}).get("id_number")
        customer = get_customer_by_national_id(national_id) if national_id else None
        if not customer:
            phone = _get_phone_from_session_id(session_id)
            if phone:
                customer = get_customer_by_phone(phone)
        if customer:
            updated_session["customer_profile"] = _customer_to_widget_data(customer)

    SESSION_STORE[session_id] = updated_session

    # Widget resolution — compare step/sub_step before vs after the agent call.
    # This is restart-safe: no stale in-memory _lastWidgetState involved.
    prev_step = current_session.get("step", "identity")
    prev_sub  = current_session.get("sub_step", "awaiting_id")
    prev_profile = current_session.get("customer_profile")
    new_step  = updated_session.get("step", "identity")
    new_sub   = updated_session.get("sub_step", "awaiting_id")
    new_profile = updated_session.get("customer_profile")
    profile_changed = prev_profile != new_profile
    state_changed = (prev_step != new_step) or (prev_sub != new_sub) or profile_changed

    if state_changed and new_step == "identity" and new_sub == "open_banking_email_sent":
        profile = updated_session.get("customer_profile") or {}
        email = profile.get("email")
        name = profile.get("name") or "Customer"
        if email:
            try:
                send_open_banking_email(email, name)
            except Exception as exc:
                logger.error("Failed to trigger Open Banking email for session %s: %s", session_id, exc)

    widget_spec = resolve_widget(updated_session, data.get("extract")) if state_changed else None

    if widget_spec and widget_spec.get("widget") == "PersonalDetailsWidget":
        if "data" in widget_spec:
            widget_spec["data"]["sessionId"] = session_id

    logger.info(
        "[routing] session=%s msg=%r state=%s/%s -> %s/%s changed=%s",
        session_id,
        last_user_msg,
        prev_step,
        prev_sub,
        new_step,
        new_sub,
        state_changed,
    )
    if widget_spec:
        logger.info(
            "[routing] session=%s widget=%s",
            session_id,
            widget_spec.get("widget"),
        )

    # Clean response text
    response_text = data.get("response", "No response generated.")
    response_text = re.sub(r"<WIDGET_DATA>[\s\S]*?</WIDGET_DATA>", "", response_text).strip()

    if prev_sub == "updating_details" and new_step == "identity" and new_sub == "personal_details":
        response_text = (
            "Your details have been successfully updated. "
            "Would you like to update any other details, or should we confirm and proceed?"
        )

    allow_upload = (
        updated_session.get("step") == "identity"
        and updated_session.get("sub_step") in {
            "modify_employment_document_pending",
            "modify_income_upload_statement",
        }
    )

    return StreamingResponse(
        _build_sse_stream(response_text, widget_spec, {"allow_upload": allow_upload}),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "x-vercel-ai-ui-message-stream": "v1",
        },
    )


@router.get("/chat/history/{session_id}")
async def get_history(session_id: str):
    """Return saved conversation history from agent persistence."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{AGENT_URL}/conversation/{session_id}")
            if resp.status_code == 200:
                data = resp.json()
                return {"messages": data.get("messages", []), "session": data.get("session")}
        except httpx.RequestError:
            pass
    return {"messages": [], "session": None}

@router.post("/update_customer")
async def api_update_customer(request: UpdateCustomerRequest):
    """Update customer in mock DB and session."""
    session_id = request.session_id
    national_id = request.national_id
    updated_data = request.updated_data
    
    # 1. Update the actual DB
    success = update_customer(national_id, updated_data)
    
    # 2. Update the session profile so UI reflects changes
    if session_id in SESSION_STORE:
        customer = get_customer_by_national_id(national_id)
        if customer:
            SESSION_STORE[session_id]["customer_profile"] = _customer_to_widget_data(customer)
            
    return {"success": success}

@router.post("/chat/send_open_banking_email")
async def api_send_open_banking_email(request: OpenBankingEmailRequest):
    """Trigger the NGP_TRIGGER_MAIL stored procedure."""
    success = send_open_banking_email(request.email, request.name)
    return {"success": success}

@router.post("/send_open_banking_email")
async def api_send_open_banking_email_alt(request: SendOpenBankingEmailRequest):
    """Trigger Open Banking email via NGP_TRIGGER_MAIL."""
    success = send_open_banking_email(request.email, request.name)
    return {"success": success}
