import os
import re
import json
import logging
from openai import AsyncOpenAI
from prompts.builder import build_system_prompt
from extractors.parser import parse_agent_response
from extractors.router import route_to_temporal
from graph.state import ConversationState

logger = logging.getLogger(__name__)

# ── LLM client ──────────────────────────────────────────────────────
_client: AsyncOpenAI | None = None
CLASSIFY_MODEL = "gpt-4o-mini"
RESPOND_MODEL  = "gpt-4o-mini"


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI()
    return _client


async def _chat(model: str, messages: list[dict], temperature: float = 0.7) -> str:
    """Call OpenAI chat completion and return the response text."""
    resp = await _get_client().chat.completions.create(
        model=model, messages=messages, temperature=temperature
    )
    return resp.choices[0].message.content or ""


# ═════════════════════════════════════════════════════════════════════
# NODE 1: CLASSIFY INTENT
# Lightweight LLM call — classify what user wants + extract structured data
# ═════════════════════════════════════════════════════════════════════
async def classify_intent(state: ConversationState) -> ConversationState:
    session = state.get("session", {})
    messages = state.get("messages", [])

    # Get last user message
    last_user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user_msg = m.get("content", "").strip()
            break

    if not last_user_msg:
        return {"intent": "GENERAL_QUERY", "classified_data": None}

    step = session.get("step", "identity")
    sub_step = session.get("sub_step", "awaiting_id")

    # ── Fast-path: deterministic extraction (no LLM needed) ──────────
    deterministic = _deterministic_classify(last_user_msg, step, sub_step, session)
    if deterministic:
        logger.info(f"[classify] Deterministic: intent={deterministic['intent']}, data={deterministic.get('data')}")
        return {
            "intent": deterministic["intent"],
            "classified_data": deterministic
        }

    # ── LLM classification for ambiguous messages ────────────────────
    classify_prompt = _build_classify_prompt(step, sub_step, session)
    oai_messages = [
        {"role": "system", "content": classify_prompt},
        {"role": "user", "content": last_user_msg}
    ]

    try:
        text = await _chat(CLASSIFY_MODEL, oai_messages, temperature=0.0)
        parsed = _parse_classify_response(text, step)
        logger.info(f"[classify] LLM: intent={parsed.get('intent')}, data={parsed.get('data')}")
        return {
            "intent": parsed.get("intent", "GENERAL_QUERY"),
            "classified_data": parsed if parsed.get("data") else None
        }
    except Exception as e:
        logger.error(f"[classify] LLM error: {e}")
        return {"intent": "GENERAL_QUERY", "classified_data": None}


# ═════════════════════════════════════════════════════════════════════
# NODE 2: EXTRACT DATA
# Parse classification → fire Temporal signal → advance session state
# ═════════════════════════════════════════════════════════════════════
async def extract_data(state: ConversationState) -> ConversationState:
    session = state.get("session", {})
    intent = state.get("intent", "GENERAL_QUERY")
    classified = state.get("classified_data")

    if not classified or intent == "GENERAL_QUERY":
        # No data to extract — skip to response
        return {"extract": None, "session": session}

    # Build extract in the format router expects
    extract = {
        "step": classified.get("step", session.get("step", "identity")),
        "intent": intent,
        "data": classified.get("data", {}),
    }

    # Handle escalation
    if intent == "ESCALATE":
        extract["escalate"] = True
        extract["escalation_reason"] = classified.get("reason", "Customer request")

    # Route to Temporal (fires signals) + advance session state machine
    if extract.get("data") or extract.get("escalate"):
        await route_to_temporal(extract, session)
        logger.info(f"[extract] Routed: step={session.get('step')}/{session.get('sub_step')}")

    return {"extract": extract, "session": session}


# ═════════════════════════════════════════════════════════════════════
# NODE 3: BUILD RESPONSE
# Full LLM call with updated session context → customer-facing message
# ═════════════════════════════════════════════════════════════════════
async def build_response(state: ConversationState) -> ConversationState:
    session = state.get("session", {})
    messages_payload = state.get("messages", [])

    # Build system prompt with UPDATED session (post-extraction)
    sys_prompt = build_system_prompt(session)

    # Format messages for OpenAI
    oai_messages = [{"role": "system", "content": sys_prompt}]
    for m in messages_payload:
        if m["role"] in ("user", "assistant"):
            oai_messages.append({"role": m["role"], "content": m["content"]})

    # Call LLM for response
    text = await _chat(RESPOND_MODEL, oai_messages, temperature=0.7)

    # Strip any <extract> blocks from response text (defensive)
    customer_message = re.sub(r'<extract>.*?</extract>', '', text, flags=re.DOTALL).strip()

    return {"last_response": customer_message}


# ═════════════════════════════════════════════════════════════════════
# HELPER: Deterministic classification (no LLM needed)
# ═════════════════════════════════════════════════════════════════════
def _deterministic_classify(msg: str, step: str, sub_step: str, session: dict) -> dict | None:
    """Fast-path extraction for messages that can be classified deterministically."""
    msg_lower = msg.lower().strip()

    # ─── IDENTITY ─────────────────────────────────────
    if step == "identity":
        if sub_step == "awaiting_id":
            id_match = re.search(r'\b([12]\d{9})\b', msg)
            if id_match:
                id_number = id_match.group(1)
                id_type = "national_id" if id_number.startswith("1") else "iqama"
                return {"step": "identity", "intent": "STEP_DATA",
                        "data": {"id_number": id_number, "id_type": id_type}}

        elif sub_step == "nafath_pending":
            signals = ["done", "approved", "open nafath", "confirmed", "yes", "ok", "verify"]
            if any(s in msg_lower for s in signals):
                return {"step": "identity", "intent": "STEP_DATA",
                        "data": {"nafath_approved": True}}

        elif sub_step == "loading":
            # Any message while loading auto-advances (user acknowledging)
            signals = ["done", "ok", "yes", "continue", "next", "proceed"]
            if any(s in msg_lower for s in signals) or len(msg_lower) > 0:
                return {"step": "identity", "intent": "STEP_DATA",
                        "data": {"loading_complete": True}}

        elif sub_step in ["verified", "personal_details"]:
            # Any confirmation moves to next step
            signals = ["done", "ok", "yes", "continue", "next", "proceed", "offer", "go"]
            if any(s in msg_lower for s in signals) or len(msg_lower) > 0:
                return {"step": "identity", "intent": "STEP_DATA",
                        "data": {"identity_complete": True}}

    # ─── OFFER ────────────────────────────────────────
    elif step == "offer":
        if sub_step == "eligible":
            signals = ["accept", "yes", "proceed", "ok", "sure", "go ahead", "done", "continue"]
            if any(s in msg_lower for s in signals):
                return {"step": "offer", "intent": "STEP_DATA",
                        "data": {"accepted_offer": True}}

        elif sub_step == "slider":
            signals = ["proceed", "next", "continue", "confirm", "done"]
            if any(s in msg_lower for s in signals):
                amount_match = re.search(r'(\d{4,6})', msg.replace(",", ""))
                amount = int(amount_match.group(1)) if amount_match else 250000
                return {"step": "offer", "intent": "STEP_DATA",
                        "data": {"loan_amount": amount, "tenure_months": 36}}

        elif sub_step == "summary":
            signals = ["proceed", "trade", "commodity", "yes", "confirm", "done", "continue"]
            if any(s in msg_lower for s in signals):
                return {"step": "offer", "intent": "STEP_DATA",
                        "data": {"proceed_trade": True}}

    # ─── TRADE ────────────────────────────────────────
    elif step == "trade":
        if sub_step == "loading":
            # Any message while trade is loading auto-advances
            return {"step": "trade", "intent": "STEP_DATA",
                    "data": {"loading_complete": True}}

        elif sub_step == "success":
            signals = ["yes", "authorize", "proceed", "confirm", "e-sign", "sign", "done", "ok", "continue"]
            if any(s in msg_lower for s in signals):
                return {"step": "trade", "intent": "STEP_DATA",
                        "data": {"confirmed": True}}

    # ─── ESIGN ────────────────────────────────────────
    elif step == "esign":
        if sub_step == "documents":
            signals = ["sign", "e-sign", "nafath", "proceed", "done", "continue"]
            if any(s in msg_lower for s in signals):
                return {"step": "esign", "intent": "STEP_DATA",
                        "data": {"esign_nafath": True}}

        elif sub_step == "otp_ivr":
            # Detect questions — don't advance on "what is OTP/IVR" type queries
            question_signals = ["what", "how", "explain", "detail", "tell me", "describe", "mean", "?"]
            is_question = any(q in msg_lower for q in question_signals)
            if is_question:
                return None  # Let LLM answer the question without advancing

            # Widget sends exact signals: "OTP Verification" or "IVR Verification"
            if msg_lower == "otp verification" or msg_lower == "otp":
                return {"step": "esign", "intent": "STEP_DATA",
                        "data": {"otp_method": "otp"}}
            elif msg_lower == "ivr verification" or msg_lower == "ivr" or msg_lower == "call":
                return {"step": "esign", "intent": "STEP_DATA",
                        "data": {"otp_method": "ivr"}}
            # Generic confirmation defaults to OTP
            generic = ["yes", "ok", "proceed", "confirm", "done", "continue", "next", "submit"]
            if any(s == msg_lower for s in generic):
                return {"step": "esign", "intent": "STEP_DATA",
                        "data": {"otp_method": "otp"}}

    # ─── DISBURSE ─────────────────────────────────────
    elif step == "disburse":
        if sub_step == "account":
            # Widget sends "ACCOUNT_SELECTED::IBAN" deterministic signal
            if msg_lower.startswith("account_selected::"):
                iban = msg.split("::", 1)[1].strip() if "::" in msg else ""
                return {"step": "disburse", "intent": "STEP_DATA",
                        "data": {"account_confirmed": True, "account_number": iban or "Selected Account"}}
            # User types submit/confirm with valid IBAN context
            iban_match = re.search(r'(SA\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})', msg, re.IGNORECASE)
            if iban_match:
                iban = re.sub(r'\s', '', iban_match.group(1))
                if len(iban) == 24:
                    return {"step": "disburse", "intent": "STEP_DATA",
                            "data": {"account_confirmed": True, "account_number": iban}}
            # Simple confirmations (user already selected via widget)
            signals = ["submit", "confirm", "done", "yes"]
            if any(s == msg_lower for s in signals):
                return {"step": "disburse", "intent": "STEP_DATA",
                        "data": {"account_confirmed": True, "account_number": "Current Account ****1234"}}

    return None


# ═════════════════════════════════════════════════════════════════════
# HELPER: Build lightweight classify prompt
# ═════════════════════════════════════════════════════════════════════
def _build_classify_prompt(step: str, sub_step: str, session: dict) -> str:
    from prompts.step_goals import EXTRACTION_SCHEMAS

    schema = EXTRACTION_SCHEMAS.get(step, '{}')
    if isinstance(schema, dict):
        schema = schema.get(session.get("region", "SA"), schema.get("SA", '{}'))

    return f"""You are an intent classifier for a loan origination system.

Current journey state:
- Step: {step}
- Sub-step: {sub_step}
- Expected data schema: {schema}

Classify the user's message into ONE of:
- STEP_DATA: User is providing data relevant to the current step. Extract the data.
- GENERAL_QUERY: User is asking a question, greeting, or chatting (NOT providing step data).
- ESCALATE: User wants to speak to a human agent.

Respond in JSON only:
{{"intent": "STEP_DATA|GENERAL_QUERY|ESCALATE", "step": "{step}", "data": {{...extracted fields...}} }}

If intent is GENERAL_QUERY, set "data" to null.
If intent is ESCALATE, set "reason" to the escalation reason.

JSON only, no explanation."""


def _parse_classify_response(text: str, step: str) -> dict:
    """Parse the JSON from classify LLM response."""
    try:
        # Try direct JSON parse
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    # Try extracting JSON from markdown code blocks
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    # Fallback
    return {"intent": "GENERAL_QUERY", "step": step, "data": None}
