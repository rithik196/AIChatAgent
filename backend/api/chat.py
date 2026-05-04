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

router = APIRouter()

AGENT_URL = "http://localhost:8001"

# ── In-memory session store (backed by agent persistence) ────────────
SESSION_STORE: dict[str, dict] = {}


# ── Helpers ──────────────────────────────────────────────────────────

def resolve_widget(session: dict, extract: dict | None) -> dict | None:
    """Map step+sub_step to widget type + data payload."""
    step = session.get("step", "identity")
    sub_step = session.get("sub_step", "")
    user_type = session.get("user_type", "new")

    if step == "identity" and sub_step == "nafath_pending":
        return {"widget": "NafathWidget", "data": {"nafath_code": session.get("nafath_code", math.floor(10 + random.random() * 89))}}

    if step == "identity" and sub_step == "loading":
        return {"widget": "LoadingWidget", "data": {"title": "Verifying OTP...", "subtitle": "Fetching Existing Records"}}

    if step == "identity" and sub_step == "verified":
        return {"widget": "VerificationSuccessWidget", "data": {"title": "Verification Successful", "subtitle": "Your details have been fetched successfully."}}

    if step == "identity" and sub_step == "personal_details":
        return {
            "widget": "PersonalDetailsWidget",
            "data": {
                "name": "Abdullah Al-Dosari",
                "phone": "+966 5X XXX XXXX",
                "email": "abdullah.d@example.com",
                "personal": {
                    "idNumber": session.get("collected", {}).get("id_number", "10XXXXXX32"),
                    "age": 34,
                    "gender": "Male",
                    "dobGR": "15-08-1989",
                    "dobHJ": "13-01-1410",
                    "address": "Riyadh, Saudi Arabia",
                    "maritalStatus": "Married",
                    "nationality": "Saudi",
                    "fatherName": "Mohammed",
                    "grandfatherName": "Saleh",
                    "dependents": "3",
                    "incomeType": "Salary"
                },
                "employment": {
                    "type": "Private Sector",
                    "industry": "Technology",
                    "employer": "Saudi Telecom Company",
                    "experience": "8",
                    "address": "King Fahd Road, Riyadh"
                },
                "income": {
                    "monthly": "SAR 25,000"
                }
            }
        }

    if step == "offer" and sub_step == "eligible":
        offer = session.get("offer", {})
        return {
            "widget": "EligibleOfferWidget",
            "data": {
                "title": "Pre Approved Offer" if user_type == "existing" else "Eligible Finance Offer",
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
    updated_session["_lastWidgetState"] = current_session.get("_lastWidgetState", "identity/awaiting_id")
    SESSION_STORE[session_id] = updated_session

    # Widget resolution — only on state transitions
    state_key = f"{updated_session['step']}/{updated_session['sub_step']}"
    prev_key = current_session.get("_lastWidgetState", "")
    widget_spec = resolve_widget(updated_session, data.get("extract")) if state_key != prev_key else None
    if widget_spec:
        updated_session["_lastWidgetState"] = state_key
        SESSION_STORE[session_id] = updated_session

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
