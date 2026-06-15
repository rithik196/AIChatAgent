import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any


_DATA_FILE = Path(__file__).with_name("agentic_faq.json")


@lru_cache(maxsize=1)
def _load_faq_data() -> dict[str, Any]:
    with _DATA_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def _format_currency(value: Any) -> str:
    try:
        number = float(value)
    except Exception:
        return "SAR N/A"
    if number.is_integer():
        return f"SAR {int(number):,}"
    return f"SAR {number:,.2f}"


def _build_context(session: dict[str, Any]) -> dict[str, str]:
    finance = session.get("finance_summary", {}) or {}
    offer = session.get("offer", {}) or {}
    account = session.get("selected_account", {}) or {}

    amount = finance.get("amount") or offer.get("max_amount")
    tenure = finance.get("tenure") or offer.get("tenure_months")
    profit_rate = finance.get("profit_rate") or offer.get("profit_rate")
    monthly_installment = finance.get("monthly_installment")
    total_payable = finance.get("total_payable")

    return {
        "finance_amount": _format_currency(amount),
        "finance_tenure": f"{tenure} months" if tenure else "N/A",
        "profit_rate": str(profit_rate) if profit_rate else "N/A",
        "monthly_installment": _format_currency(monthly_installment),
        "total_payable": _format_currency(total_payable),
        "iban": account.get("iban") or "N/A",
        "bank_name": account.get("bank") or "N/A",
        "beneficiary": account.get("beneficiary") or "N/A",
    }


def _score_domain(message: str, keywords: list[str]) -> int:
    score = 0
    for keyword in keywords:
        keyword_norm = _normalize(keyword)
        if not keyword_norm:
            continue
        if keyword_norm in message:
            score += 3 if " " in keyword_norm else 2
            continue
        pieces = [p for p in re.split(r"[^a-z0-9]+", keyword_norm) if p]
        if pieces and all(piece in message for piece in pieces):
            score += 1
    return score


def _is_banking_context(message: str, data: dict[str, Any]) -> bool:
    return any(_normalize(k) in message for k in data.get("banking_context_keywords", []))


def answer_general_query(message: str, session: dict[str, Any]) -> dict[str, Any] | None:
    data = _load_faq_data()
    msg = _normalize(message)
    if not msg:
        return None

    best = None
    best_score = 0
    for domain in data.get("domains", []):
        score = _score_domain(msg, domain.get("keywords", []))
        if score > best_score:
            best_score = score
            best = domain

    if best and best_score >= 2:
        context = _build_context(session)
        text = best.get("response_template", "").format(**context).strip()
        return {"text": text, "domain": best.get("id"), "score": best_score}

    if not _is_banking_context(msg, data):
        fallback = (data.get("out_of_scope_messages") or ["Sorry, I can only assist with banking-related queries."])[0]
        return {"text": fallback, "domain": "out_of_scope", "score": 0}

    return None

