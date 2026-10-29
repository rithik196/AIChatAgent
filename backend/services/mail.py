"""
Mail service for ConsentPortal email delivery.

This module sends the Open Banking consent email through the external
ConsentPortalBackend API instead of the legacy MSSQL stored procedure path.
"""

from __future__ import annotations

import logging
import os
from html import escape
from threading import Thread
from urllib.parse import quote_plus
from typing import Any

import httpx

logger = logging.getLogger(__name__)

CONSENT_PORTAL_BASE_URL = os.getenv(
    "CONSENT_PORTAL_BASE_URL",
    "https://hnbdemo.newgensoftware.net/ksaMobileAppBackend/api/v1",
).rstrip("/")
CONSENT_PORTAL_EMAIL_PATH = os.getenv(
    "CONSENT_PORTAL_EMAIL_PATH",
    "/email/sendRealEstateFinanceApplicationMail",
)
DOCUSIGN_PORTAL_BASE_URL = os.getenv(
    "DOCUSIGN_PORTAL_BASE_URL",
    "https://tytlmsdemo.newgensoftware.net:8443/docusign218/qs01",
).rstrip("/")
DEFAULT_DOCUSIGN_SIGNER_EMAIL = os.getenv("DEFAULT_DOCUSIGN_SIGNER_EMAIL", "bhavya@gmail.com")
INDIA_DOCUSIGN_SIGNER_EMAIL = os.getenv("INDIA_DOCUSIGN_SIGNER_EMAIL", "vaidaryan5@gmail.com")


def _build_docusign_link(
    signer_name: str,
    signer_email: str,
    doc_name: str,
    transaction_id: str,
    page: int,
    region: str = "SA",
) -> str:
    final_signer_email = INDIA_DOCUSIGN_SIGNER_EMAIL if region == "IN" else signer_email
    return (
        f"{DOCUSIGN_PORTAL_BASE_URL}"
        f"?signerName={quote_plus(signer_name)}"
        f"&signerEmail={quote_plus(final_signer_email)}"
        f"&docName={quote_plus(doc_name)}"
        f"&transactionId={quote_plus(transaction_id)}"
        f"&x=400&y=680&page={page}"
    )


def _build_open_banking_email(customer_name: str) -> dict[str, str]:
    subject = "Action Required: Link Your Bank Account via Open Banking"
    mail_body = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #1a1a2e; background: #f8fafc; padding: 30px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <h2 style="color: #1B6A8A; margin-bottom: 8px;">Open Banking Account Linking</h2>
    <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Hello {customer_name},</p>
    <p style="font-size: 15px; line-height: 1.6;">
      As requested during your finance application, please click the link below to securely link your bank account via Open Banking.
      This will allow us to verify your income and provide you with the best possible offer.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="#" style="background: linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-weight: 600; font-size: 15px;">
        Link My Bank Account
      </a>
    </div>
    <p style="font-size: 13px; color: #94a3b8;">
      This link is valid for 15 minutes. If you did not request this, please ignore this email or contact us immediately.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 12px; color: #cbd5e1; text-align: center;">Powered by Raya Finance Agent</p>
  </div>
</body>
</html>
""".strip()

    return {"subject": subject, "mailBody": mail_body}


def _build_india_higher_amount_open_banking_email(customer_name: str) -> dict[str, str]:
    subject = "Action Required: Review & Approve Account Aggregator Consent"
    mail_body = f"""
<html>
<body style="margin:0; padding:0; background:#f8fafc; font-family: Arial, sans-serif; color:#0f172a;">
  <div style="padding: 28px 16px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 28px; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
      <h2 style="margin: 0 0 10px 0; color: #1f3c88; font-size: 24px; line-height: 1.2;">Hello {customer_name},</h2>
      <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.7; color: #334155;">
        You&apos;ve taken a step towards your loan application. To securely fetch your financial information, we need your consent via Account Aggregator.
      </p>

      <div style="border: 1px solid #dbe7ff; background: #f8fbff; border-radius: 16px; padding: 20px; margin: 0 0 20px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Action Required</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
          Please click the button below to review and approve the consent request. This will help us retrieve your financial data securely.
        </p>
        <a href="#" style="display:inline-block; padding: 12px 24px; border-radius: 9999px; background:#1457D7; color:#ffffff; text-decoration:none; font-size:14px; font-weight:700;">
          Review &amp; Approve Consent
        </a>
        <p style="margin: 14px 0 0 0; font-size: 12px; color: #64748b;">This link is valid for 24 hours from the time of this email.</p>
      </div>

      <div style="margin: 0 0 18px 0;">
        <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #0f172a;">Why is this needed?</p>
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
          Your consent allows us to securely access your financial information from your bank via Account Aggregator to process your loan application faster.
        </p>
      </div>

      <div style="margin: 0 0 18px 0;">
        <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #0f172a;">Important Notes:</p>
        <ul style="margin: 0; padding-left: 18px; color: #475569; font-size: 13px; line-height: 1.7;">
          <li>This link is unique to you. Please do not share it with anyone.</li>
          <li>If you did not initiate this request, please ignore this email.</li>
          <li>For any queries, contact our support team.</li>
        </ul>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 13px; color: #475569;">
        <p style="margin: 0 0 6px 0; font-weight: 700;">Need Help?</p>
        <p style="margin: 0;">1800-123-4567 &nbsp; | &nbsp; support@loanagent.com</p>
      </div>
    </div>
  </div>
</body>
</html>
""".strip()

    return {"subject": subject, "mailBody": mail_body}


def _build_docusign_email(customer_name: str, contract_only: bool = False) -> dict[str, str]:
    subject = "Action Required: Review and Sign Your Documents"
    contract_url = _build_docusign_link(
        customer_name,
    DEFAULT_DOCUSIGN_SIGNER_EMAIL,
        "ContractSaudi",
        "ContractSaudi",
        9,
    )
    if contract_only:
        return {
            "subject": "Action Required: Review and Sign Your Financing Contract",
            "mailBody": f"""
<html>
<body style="font-family: Arial, sans-serif; color: #0f172a; padding: 24px;">
  <h2>E-Sign Your Financing Contract</h2>
  <p>Hello {escape(customer_name)},</p>
  <p>Your Financing Contract is ready for signature. Please review and sign the contract using the button below.</p>
  <a href="{escape(contract_url, quote=True)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 22px; background: #1B739E; color: #ffffff; text-decoration: none; border-radius: 8px;">Proceed to e-sign contract</a>
  <p>Powered by Raya Finance Agent</p>
</body>
</html>
""".strip(),
        }
    promissory_url = _build_docusign_link(
        customer_name,
    DEFAULT_DOCUSIGN_SIGNER_EMAIL,
        "PromissoryNote",
        "PromissoryNote",
        4,
    )
    mail_body = """
<html>
<body style="margin:0; padding:0; background:#f8fafc; font-family: Arial, sans-serif; color:#0f172a;">
  <div style="padding: 32px 20px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 32px; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);">
      <h2 style="margin: 0 0 10px 0; color: #1B6A8A; font-size: 24px; line-height: 1.2;">E-Sign Your Documents</h2>
      <p style="margin: 0 0 18px 0; color: #64748b; font-size: 14px;">Hello {customer_name},</p>
      <p style="margin: 0 0 22px 0; font-size: 15px; line-height: 1.7; color: #0f172a;">
        Your Contract Saudi and Promissory Note documents are ready for signature. Please open each document using the button below.
      </p>

      <div style="margin: 0 0 18px 0;">
        <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #0f172a;">Contract Saudi</p>
        <a href="{contract_url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 22px; border-radius: 9999px; background: #1B739E; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700;">
          proceed to e-sign
        </a>
      </div>

      <div style="margin: 0 0 18px 0;">
        <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #0f172a;">Promissory Note</p>
        <a href="{promissory_url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 22px; border-radius: 9999px; background: #1B739E; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700;">
         proceed to e-sign
        </a>
      </div>

      <p style="margin: 22px 0 0 0; font-size: 13px; line-height: 1.6; color: #64748b;">
        If a button does not open correctly, please copy and paste the link into your browser.
      </p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #cbd5e1; text-align: center;">Powered by Raya Finance Agent</p>
    </div>
  </div>
</body>
</html>
""".format(customer_name=customer_name, contract_url=contract_url, promissory_url=promissory_url).strip()

    return {"subject": subject, "mailBody": mail_body}


def _build_promissory_note_email(customer_name: str) -> dict[str, str]:
  note_url = _build_docusign_link(
    customer_name, DEFAULT_DOCUSIGN_SIGNER_EMAIL, "PromissoryNote", "PromissoryNote", 4,
  )
  return {
    "subject": "Action Required: Review and Sign Your Promissory Note",
    "mailBody": f"""
<html>
<body style="font-family: Arial, sans-serif; color: #0f172a; padding: 24px;">
  <h2>E-Sign Your Promissory Note</h2>
  <p>Hello {escape(customer_name)},</p>
  <p>Your Promissory Note is ready for signature. Please review and sign it using the button below.</p>
  <a href="{escape(note_url, quote=True)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 22px; background: #1B739E; color: #ffffff; text-decoration: none; border-radius: 8px;">Proceed to e-sign Promissory Note</a>
  <p>Powered by Raya Finance Agent</p>
</body>
</html>
""".strip(),
  }


def _build_india_docusign_email(customer_name: str, template: str = "preapproved") -> dict[str, str]:
    subject = "Action Required: Review and Sign Your Facility Letter"
    is_higher_amount = template == "higher_amount"
    doc_name = "Facility_Letter_NHA" if is_higher_amount else "Facility_Letter_PAO"
    facility_url = _build_docusign_link(
        customer_name,
        INDIA_DOCUSIGN_SIGNER_EMAIL,
        doc_name,
        doc_name,
        1,
        region="IN",
    )
    offer_type = "counter" if is_higher_amount else "pre-approved"
    mail_body = f"""
<html>
<body style="margin:0; padding:0; background:#f8fafc; font-family: Arial, sans-serif; color:#0f172a;">
  <div style="padding: 32px 20px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 32px; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);">
      <h2 style="margin: 0 0 10px 0; color: #1f3c88; font-size: 24px; line-height: 1.2;">E-Sign Your Facility Letter</h2>
      <p style="margin: 0 0 18px 0; color: #64748b; font-size: 14px;">Hello {customer_name},</p>
      <p style="margin: 0 0 22px 0; font-size: 15px; line-height: 1.7; color: #0f172a;">
        Your {offer_type} facility letter is ready for electronic signature. Please click the button below to review and e-sign your document.
      </p>

      <div style="margin: 0 0 18px 0;">
        <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #0f172a;">{doc_name}</p>
        <a href="{facility_url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 22px; border-radius: 9999px; background: #1f3c88; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700;">
          Proceed to E-Sign
        </a>
      </div>

      <p style="margin: 22px 0 0 0; font-size: 13px; line-height: 1.6; color: #64748b;">
        If a button does not open correctly, please copy and paste the link into your browser.
      </p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #cbd5e1; text-align: center;">Powered by Raya Finance Agent</p>
    </div>
  </div>
</body>
</html>
""".strip()

    return {"subject": subject, "mailBody": mail_body}


def _log_email_request(prefix: str, url: str, customer_email: str, payload: dict[str, Any]) -> None:
    logger.info("[%s] url=%s", prefix, url)
    logger.info("[%s] mailTo=%s", prefix, customer_email)
    logger.info("[%s] subject=%s", prefix, payload.get("subject"))
    logger.info("[%s] mailBody=%s", prefix, payload.get("mailBody"))


def send_open_banking_email(customer_email: str, customer_name: str, template: str = "default") -> bool:
  """Send the Open Banking consent email through ConsentPortalBackend."""
  email_builder = _build_india_higher_amount_open_banking_email if template == "india_higher_amount" else _build_open_banking_email
  payload: dict[str, Any] = {
    **email_builder(customer_name),
    "mailTo": customer_email,
    "documentIndex": "",
  }

  url = f"{CONSENT_PORTAL_BASE_URL}{CONSENT_PORTAL_EMAIL_PATH}"
  _log_email_request("ConsentPortal open banking email request prepared", url, customer_email, payload)

  try:
    with httpx.Client(timeout=20.0) as client:
      response = client.post(url, json=payload)
    logger.info(
      "ConsentPortal open banking email API response: status=%s mailTo=%s body=%s",
      response.status_code,
      customer_email,
      response.text,
    )
    if response.status_code >= 400:
      logger.error(
        "ConsentPortal email API failed: status=%s body=%s",
        response.status_code,
        response.text,
      )
      return False

    logger.info("ConsentPortal open banking email API called successfully for: %s | url=%s", customer_email, url)
    return True
  except Exception as exc:
    logger.error("ConsentPortal email API request failed: %s", exc)
    return False


def request_docusign_email(
    session: dict,
    customer_email: str | None,
    customer_name: str,
    template: str,
    region: str = "SA",
) -> None:
    """Request a journey e-sign email without waiting for external delivery."""
    sent_key = "promissory_email_sent" if template == "promissory_note" else "docusign_email_sent"
    requested_key = "promissory_email_requested" if template == "promissory_note" else "docusign_email_requested"
    if session.get(sent_key) or session.get(requested_key):
        return
    if not customer_email:
        logger.warning("Cannot request %s signing email: customer email is missing; continuing journey", template)
        return

    def deliver() -> None:
        try:
            if not send_docusign_email(customer_email, customer_name, template=template, region=region):
                logger.warning("%s signing email delivery failed; journey remains unblocked", template)
        except Exception:
            logger.exception("%s signing email delivery failed; journey remains unblocked", template)

    try:
        Thread(target=deliver, name=f"esign-email-{template}", daemon=True).start()
    except RuntimeError:
        logger.exception("Could not start %s signing email delivery; continuing journey", template)
        return
    session[requested_key] = True


def send_docusign_email(
    customer_email: str,
    customer_name: str,
    template: str = "default",
    region: str = "SA",
) -> bool:
    """Send the e-sign document email through ConsentPortalBackend."""
    email_content = (
        _build_india_docusign_email(customer_name, template=template)
        if region == "IN"
        else _build_promissory_note_email(customer_name)
        if template == "promissory_note"
        else _build_docusign_email(customer_name, contract_only=template == "murabaha_contract")
    )
    payload: dict[str, Any] = {
        **email_content,
        "mailTo": customer_email,
        "documentIndex": "",
    }

    url = f"{CONSENT_PORTAL_BASE_URL}{CONSENT_PORTAL_EMAIL_PATH}"
    _log_email_request("ConsentPortal docusign email request prepared", url, customer_email, payload)

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post(url, json=payload)
        logger.info(
            "ConsentPortal docusign email API response: status=%s mailTo=%s body=%s",
            response.status_code,
            customer_email,
            response.text,
        )
        if response.status_code >= 400:
            logger.error(
                "ConsentPortal docusign email API failed: status=%s body=%s",
                response.status_code,
                response.text,
            )
            return False

        logger.info("ConsentPortal docusign email API called successfully for: %s | url=%s", customer_email, url)
        return True
    except Exception as exc:
        logger.error("ConsentPortal docusign email API request failed: %s", exc)
        return False
