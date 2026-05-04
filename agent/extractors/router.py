import logging
import uuid
from temporalio.client import Client
from temporalio.service import RPCError

logger = logging.getLogger(__name__)

# IDs starting with "1" are existing users, "2" are new users
EXISTING_USER_IDS = {"1234567890", "1111111111", "1987654321"}

# Track which sessions have a running Temporal workflow
_TEMPORAL_WORKFLOWS: dict[str, bool] = {}


def detect_user_type(id_number: str) -> str:
    """Detect user type based on ID number.
    IDs starting with '1' are existing customers, '2' are new."""
    if id_number in EXISTING_USER_IDS:
        return "existing"
    if id_number and id_number.startswith("1"):
        return "existing"
    return "new"


async def _get_or_start_workflow(client: Client, session: dict):
    """Get existing workflow handle or start a new one."""
    application_id = session.get("application_id", f"rlos-{uuid.uuid4().hex[:8]}")
    session["application_id"] = application_id

    # If we already started this workflow, just get the handle
    if _TEMPORAL_WORKFLOWS.get(application_id):
        return client.get_workflow_handle(application_id)

    # Try to get existing workflow first
    try:
        handle = client.get_workflow_handle(application_id)
        # Verify it exists by describing it
        await handle.describe()
        _TEMPORAL_WORKFLOWS[application_id] = True
        return handle
    except Exception:
        pass

    # Start a new workflow
    try:
        from shared.models.journey import LoanInput
        from shared.constants.products import Product
        from shared.constants.regions import Region
        from shared.constants.languages import Language

        region_map = {"SA": Region.SA, "UAE": Region.UAE, "IN": Region.IN, "BH": Region.BH, "KW": Region.KW}
        region = region_map.get(session.get("region", "SA"), Region.SA)

        inp = LoanInput(
            customer_id=session.get("collected", {}).get("id_number", "unknown"),
            region=region,
            product=Product.CASH_FINANCE,
        )
        handle = await client.start_workflow(
            "RLOSWorkflow",
            inp,
            id=application_id,
            task_queue="rlos-queue",
        )
        _TEMPORAL_WORKFLOWS[application_id] = True
        logger.info(f"Started Temporal workflow: {application_id}")
        return handle
    except Exception as e:
        logger.error(f"Failed to start Temporal workflow: {e}")
        raise


async def route_to_temporal(extract: dict, session: dict) -> None:
    if not extract:
        return

    intent = extract.get("intent", "")

    # Always advance session state first (works with or without Temporal)
    data = extract.get("data")
    should_send_identity_verified = False
    if data and intent in ["STEP_DATA", "BOTH"]:
        # Before advancing session state, check if we need to send identity_verified
        current_step = session.get("step", "identity")
        current_sub = session.get("sub_step", "awaiting_id")
        if current_step == "identity" and current_sub == "loading" and (data.get("loading_complete") or data.get("nafath_approved")):
            should_send_identity_verified = True
        _advance_session_state(extract, session)

    # Try to send Temporal signals (non-blocking — failures fall back to session state)
    try:
        client = await Client.connect("localhost:7233")
        workflow_handle = await _get_or_start_workflow(client, session)
    except Exception as e:
        logger.warning(f"Temporal unavailable, using session-based state: {e}")
        return

    if should_send_identity_verified:
        try:
            await workflow_handle.signal("identity_verified", data)
            logger.info(f"Temporal signal: identity_verified")
        except Exception as e:
            logger.error(f"Temporal signal failed (identity_verified): {e}")

    if extract.get("escalate"):
        logger.info(f"Signal: escalate_to_human, Reason: {extract.get('escalation_reason')}")
        try:
            await workflow_handle.signal("escalate_to_human", {"reason": extract.get("escalation_reason")})
        except Exception as e:
            logger.error(f"Temporal signal failed: {e}")
        session["step"] = "escalated"
        return

    if extract.get("failed_attempt"):
        session["failed_attempts"] = session.get("failed_attempts", 0) + 1
        if session["failed_attempts"] >= 3:
            logger.info("Signal: max_attempts_reached")
            try:
                await workflow_handle.signal("max_attempts_reached", {})
            except Exception as e:
                logger.error(f"Temporal signal failed: {e}")
            session["step"] = "escalated"
        return

    if data and intent in ["STEP_DATA", "BOTH"]:
        # Send Temporal signals based on what was extracted
        current = session.get("step")
        try:
            if current == "identity" and data.get("id_number"):
                await workflow_handle.signal("identity_received", data)
                logger.info(f"Temporal signal: identity_received")
            elif current == "offer" and data.get("loan_amount"):
                await workflow_handle.signal("offer_selected", data)
                logger.info(f"Temporal signal: offer_selected")
            elif current == "trade" and data.get("confirmed"):
                await workflow_handle.signal("trade_confirmed", data)
                logger.info(f"Temporal signal: trade_confirmed")
            elif current == "esign" and data.get("signed") or data.get("esign_nafath"):
                await workflow_handle.signal("esign_completed", data)
                logger.info(f"Temporal signal: esign_completed")
            elif current == "disburse" and data.get("account_confirmed"):
                await workflow_handle.signal("disburse_confirmed", data)
                logger.info(f"Temporal signal: disburse_confirmed")
        except Exception as e:
            logger.error(f"Temporal signal failed (non-fatal): {e}")


def _advance_session_state(extract: dict, session: dict) -> None:
    """Advance session state machine based on extracted data.
    This handles sub-step transitions for the guided autonomy engine."""
    
    data = extract.get("data", {})
    if not data:
        return
    
    current_step = session.get("step", "identity")
    current_sub = session.get("sub_step", "awaiting_id")

    # ═══════════════════════════════════════════
    # STEP 1: IDENTITY
    # ═══════════════════════════════════════════
    if current_step == "identity":
        if data.get("id_number") and current_sub == "awaiting_id":
            # Validate ID format: must be exactly 10 digits starting with 1 or 2
            id_number = str(data["id_number"]).strip()
            if not (len(id_number) == 10 and id_number[0] in ("1", "2") and id_number.isdigit()):
                logger.warning(f"Invalid ID format rejected: {id_number}")
                return  # Don't advance — let LLM ask user to retry
            user_type = detect_user_type(id_number)
            session["user_type"] = user_type
            session["collected"]["id_number"] = id_number
            session["collected"]["id_type"] = data.get("id_type", "national_id")
            session["sub_step"] = "nafath_pending"
            session["nafath_code"] = int(str(hash(id_number))[-2:].replace("-", "")) % 90 + 10
            logger.info(f"ID received: {id_number}, user_type: {user_type}, nafath_code: {session['nafath_code']}")

        elif data.get("nafath_approved") and current_sub == "nafath_pending":
            session["sub_step"] = "loading"
            logger.info("Nafath approved, transitioning to loading...")

        elif current_sub == "loading" and (data.get("loading_complete") or data.get("nafath_approved")):
            session["sub_step"] = "verified"
            logger.info("Verification complete")

        elif (current_sub == "verified") and (data.get("identity_complete") or data.get("loading_complete")):
            session["sub_step"] = "personal_details"
            logger.info("Moving to personal details")

        elif (current_sub == "personal_details") and (data.get("identity_complete") or data.get("loading_complete")):
            # Move to offer step
            session["step"] = "offer"
            session["step_number"] = 2
            session["sub_step"] = "eligible"
            session["offer"] = {
                "max_amount": 350000,
                "profit_rate": "12%",
                "max_tenure": 60,
            }
            logger.info("Moving to offer step (eligible)")

    # ═══════════════════════════════════════════
    # STEP 2: OFFER
    # ═══════════════════════════════════════════
    elif current_step == "offer":
        if data.get("accepted_offer") and current_sub == "eligible":
            session["sub_step"] = "slider"
            logger.info("Offer accepted, showing slider")

        elif data.get("loan_amount") and current_sub == "slider":
            amount = data["loan_amount"]
            tenure = data.get("tenure_months", 36)
            profit_rate = 0.15
            monthly_rate = profit_rate / 12
            if monthly_rate > 0:
                emi = (amount * monthly_rate * (1 + monthly_rate) ** tenure) / ((1 + monthly_rate) ** tenure - 1)
            else:
                emi = amount / tenure
            
            session["finance_summary"] = {
                "amount": amount,
                "tenure": tenure,
                "profit_rate": "15%",
                "monthly_installment": round(emi),
                "total_payable": round(emi * tenure),
            }
            session["sub_step"] = "summary"
            logger.info(f"Loan configured: {amount} SAR, {tenure} months")

        elif data.get("proceed_trade") and current_sub == "summary":
            session["step"] = "trade"
            session["step_number"] = 3
            session["sub_step"] = "loading"
            logger.info("Moving to trade step")

    # ═══════════════════════════════════════════
    # STEP 3: TRADE
    # ═══════════════════════════════════════════
    elif current_step == "trade":
        if current_sub == "loading" and (data.get("loading_complete") or data.get("confirmed")):
            session["sub_step"] = "success"
            logger.info("Trade execution complete")
        
        elif data.get("confirmed") and current_sub == "success":
            session["step"] = "esign"
            session["step_number"] = 4
            session["sub_step"] = "documents"
            logger.info("Moving to esign step")

    # ═══════════════════════════════════════════
    # STEP 4: E-SIGN
    # ═══════════════════════════════════════════
    elif current_step == "esign":
        if (data.get("signed") or data.get("esign_nafath")) and current_sub == "documents":
            session["sub_step"] = "otp_ivr"
            logger.info("E-Sign complete, showing OTP/IVR choice")

        elif data.get("otp_method") and current_sub == "otp_ivr":
            session["step"] = "disburse"
            session["step_number"] = 5
            session["sub_step"] = "account"
            logger.info("Moving to disbursement step")

    # ═══════════════════════════════════════════
    # STEP 5: DISBURSE
    # ═══════════════════════════════════════════
    elif current_step == "disburse":
        if data.get("account_confirmed"):
            import datetime
            session["disbursement"] = {
                "reference": f"PF-2025-{str(hash(session.get('collected', {}).get('id_number', '')))[:8].upper()}",
                "date": datetime.datetime.now().strftime("%d %B %Y"),
                "amount": session.get("finance_summary", {}).get("amount", 250000),
                "account": data.get("account_number", "Current Account ****1234"),
                "tenure": f"{session.get('finance_summary', {}).get('tenure', 36)} Months",
                "profit_rate": session.get("finance_summary", {}).get("profit_rate", "15%"),
                "first_installment": (datetime.datetime.now() + datetime.timedelta(days=90)).strftime("%d %B %Y"),
                "monthly_installment": session.get("finance_summary", {}).get("monthly_installment", 4638),
                "total_payable": session.get("finance_summary", {}).get("total_payable", 277968),
            }
            session["step"] = "done"
            session["sub_step"] = "complete"
            logger.info("Disbursement confirmed, journey complete!")
