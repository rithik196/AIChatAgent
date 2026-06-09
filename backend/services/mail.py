"""
Mail service — triggers the NGP_TRIGGER_MAIL stored procedure via pyodbc.
Mirrors the Java implementation:
    inputParamaList.add("Text:" + finalMail);
    inputParamaList.add("Text:" + subject);
    inputParamaList.add("Text:" + htmlMailBody);
    inputParamaList.add("Text:");
    getDataFromStoredProcedure("NGP_TRIGGER_MAIL", inputParamaList);
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def send_email_via_sp(
    to_email: str,
    subject: str,
    html_body: str,
    cc: str = "",
) -> bool:
    """
    Call the NGP_TRIGGER_MAIL stored procedure to send an email.
    Parameters are prefixed with 'Text:' to match the Java SP calling convention.

    Args:
        to_email:  Recipient email address
        subject:   Email subject line
        html_body: HTML email body
        cc:        CC recipient (empty string if none)

    Returns:
        True on success, False on failure.
    """
    try:
        from shared.db.mssql import get_connection  # type: ignore

        # Prefix each parameter with "Text:" to match the Java calling convention
        params = (
            f"Text:{to_email}",
            f"Text:{subject}",
            f"Text:{html_body}",
            f"Text:{cc}",
        )

        with get_connection() as conn:
            cursor = conn.cursor()
            # Call the stored procedure with positional ? placeholders
            cursor.execute("{CALL NGP_TRIGGER_MAIL (?, ?, ?, ?)}", params)
            conn.commit()

        logger.info("NGP_TRIGGER_MAIL called successfully for: %s | Subject: %s", to_email, subject)
        return True

    except Exception as exc:
        logger.error("NGP_TRIGGER_MAIL failed: %s", exc)
        return False


def send_open_banking_email(customer_email: str, customer_name: str) -> bool:
    """Send the Open Banking account linking email to the customer."""
    subject = "Action Required: Link Your Bank Account via Open Banking"
    html_body = f"""
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
"""
    return send_email_via_sp(customer_email, subject, html_body)
