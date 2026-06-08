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

from db import get_customer_by_phone, get_customer_by_national_id

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
    return {
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "personal": {
            "idNumber": customer.personal.id_number,
            "age": customer.personal.age,
            "gender": customer.personal.gender,
            "dobGR": customer.personal.dob_gr,
            "dobHJ": customer.personal.dob_hj,
            "address": customer.personal.address,
            "maritalStatus": customer.personal.marital_status,
            "nationality": customer.personal.nationality,
            "fatherName": customer.personal.father_name,
            "grandfatherName": customer.personal.grandfather_name,
            "dependents": customer.personal.dependents,
            "incomeType": customer.personal.income_type,
        },
        "employment": {
            "type": customer.employment.type,
            "industry": customer.employment.industry,
            "employer": customer.employment.employer,
            "experience": customer.employment.experience,
            "address": customer.employment.address,
        },
        "income": {
            "monthly": customer.income.monthly,
        },
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
        customer = session.get("customer_profile")
        return {
            "widget": "PersonalDetailsWidget",
            "data": customer or {
                "name": "Customer",
                "phone": "",
                "email": "",
                "personal": {
                    "idNumber": session.get("collected", {}).get("id_number", ""),
                    "age": 0,
                    "gender": "",
                    "dobGR": "",
                    "dobHJ": "",
                    "address": "",
                    "maritalStatus": "",
                    "nationality": "",
                    "fatherName": "",
                    "grandfatherName": "",
                    "dependents": "",
                    "incomeType": ""
                },
                "employment": {
                    "type": "",
                    "industry": "",
                    "employer": "",
                    "experience": "",
                    "address": ""
                },
                "income": {
                    "monthly": ""
                }
            }
        }

    if step == "offer" and sub_step == "eligible":
        offer = session.get("offer", {})
        return {
            "widget": "EligibleOfferWidget",
            "data": {
                "title": "Pre Approved Offer" if customer_type == "ETB" and journey_mode == "ETB_CORE" else "Eligible Finance Offer",
                "max_amount": offer.get("max_amount", 350000),
                "profit_rate": offer.get("profit_rate", "12%"),
                "max_tenure": offer.get("max_tenure", 60),
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
            "data": session.get("finance_summary", {
                "amount": 250000,
                "tenure": 36,
                "profit_rate": "15%",
                "monthly_installment": 4638,
                "total_payable": 277968,
            }),
        }

    if step == "trade" and sub_step == "loading":
        return {"widget": "LoadingWidget", "data": {"title": "Executing Commodity Trade...", "subtitle": "Processing your Murabaha transaction"}}

    if step == "trade" and sub_step == "success":
        return {"widget": "VerificationSuccessWidget", "data": {"title": "Commodity Trade Successful", "subtitle": "Your Murabaha transaction has been completed."}}

    if step == "esign" and sub_step == "documents":
        return {
            "widget": "DocumentPreviewWidget",
            "data": {
                "documents": [
                    {"name": "Contract Letter", "type": "pdf"},
                    {"name": "Promissory Note", "type": "pdf"},
                ],
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
        return {
            "widget": "DisbursementWidget",
            "data": session.get("disbursement", {
                "reference": "PF-2025-XXXXXXXX",
                "date": time.strftime("%d %B %Y"),
                "amount": 250000,
                "account": "Current Account ****1234",
                "tenure": "36 Months",
                "profit_rate": "15%",
                "first_installment": "03 July 2025",
                "monthly_installment": 4638,
                "total_payable": 277968,
            }),
        }

    return None


# ── SSE stream builder (AI SDK v6 UIMessageStream protocol) ─────────

def _build_sse_stream(response_text: str, widget_spec: dict | None):
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

    if widget_spec:
        yield _event(json.dumps({"type": "message-metadata", "messageMetadata": {"widget": widget_spec}}))

    yield _event(json.dumps({"type": "finish-step"}))
    yield _event(json.dumps({"type": "finish"}))
    yield "data: [DONE]\n\n"


# ── Request models ───────────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]]


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
    new_step  = updated_session.get("step", "identity")
    new_sub   = updated_session.get("sub_step", "awaiting_id")
    state_changed = (prev_step != new_step) or (prev_sub != new_sub)
    widget_spec = resolve_widget(updated_session, data.get("extract")) if state_changed else None

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

    return StreamingResponse(
        _build_sse_stream(response_text, widget_spec),
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
