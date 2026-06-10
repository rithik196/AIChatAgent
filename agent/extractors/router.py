import logging
import os
import uuid
from temporalio.client import Client
from temporalio.service import RPCError
from backend.utils.eligibility import calculate_max_eligible_amount, validate_iban

logger = logging.getLogger(__name__)

# IDs starting with "1" are existing users, "2" are new users
EXISTING_USER_IDS = {"1234567890", "1111111111", "1987654321"}

# Track which sessions have a running Temporal workflow
_TEMPORAL_WORKFLOWS: dict[str, bool] = {}
_TEMPORAL_ENABLED = os.getenv("RLOS_ENABLE_TEMPORAL", "false").lower() in {"1", "true", "yes", "on"}

CUSTOMER_TYPE_ETB = "ETB"
CUSTOMER_TYPE_NTB = "NTB"
CUSTOMER_TYPE_UNKNOWN = "UNKNOWN"

JOURNEY_MODE_PRE_DEDUPE = "PRE_DEDUPE"
JOURNEY_MODE_ETB_CORE = "ETB_CORE"
JOURNEY_MODE_NTB_ENRICHMENT = "NTB_ENRICHMENT"

# ETB Configuration (A1a: Bureau consent mandatory for ETB)
ETB_REQUIRE_BUREAU_CONSENT = True

MODIFY_SECTION_PERSONAL = "personal"
MODIFY_SECTION_ADDRESS = "address"
MODIFY_SECTION_EMPLOYMENT = "employment"
MODIFY_SECTION_INCOME = "income"


def _begin_updating(session: dict, section: str, auto_advance_ms: int = 3000, next_signal: str = "update_complete", next_sub_step: str = "personal_details") -> None:
    session["sub_step"] = "updating_details"
    session["updating"] = {
        "section": section,
        "auto_advance_ms": auto_advance_ms,
        "next_message": next_signal,
        "silent": True,
        "next_sub_step": next_sub_step,
    }


def detect_user_type(id_number: str) -> str:
    """Detect user type based on ID number."""
    if id_number == "1046403930":
        return "existing"
    if id_number == "1046403940":
        return "new"
    
    if id_number in EXISTING_USER_IDS:
        return "existing"
    return "new"


def detect_customer_type(id_number: str) -> str:
    """Return the immutable customer type used for journey routing."""
    return CUSTOMER_TYPE_ETB if detect_user_type(id_number) == "existing" else CUSTOMER_TYPE_NTB


def _sync_customer_routing_fields(session: dict) -> None:
    """Keep legacy user_type aligned with immutable customerType for compatibility."""
    customer_type = session.get("customerType") or CUSTOMER_TYPE_UNKNOWN
    legacy_user_type = session.get("user_type")

    if customer_type == CUSTOMER_TYPE_UNKNOWN and legacy_user_type in {"existing", "new"}:
        customer_type = CUSTOMER_TYPE_ETB if legacy_user_type == "existing" else CUSTOMER_TYPE_NTB
        session["customerType"] = customer_type

    if customer_type == CUSTOMER_TYPE_ETB:
        session["user_type"] = "existing"
    elif customer_type == CUSTOMER_TYPE_NTB:
        session["user_type"] = "new"

    session.setdefault("journeyMode", JOURNEY_MODE_PRE_DEDUPE)
    session.setdefault("journeyOrigin", CUSTOMER_TYPE_UNKNOWN)
    session.setdefault("transitionReason", None)


def _set_customer_identity(session: dict, id_number: str) -> None:
    """Set immutable customer identity fields once from the captured ID."""
    resolved_type = detect_customer_type(id_number)
    if session.get("customerType") in (None, "", CUSTOMER_TYPE_UNKNOWN):
        session["customerType"] = resolved_type
    if session.get("journeyOrigin") in (None, "", CUSTOMER_TYPE_UNKNOWN):
        session["journeyOrigin"] = session["customerType"]
    _sync_customer_routing_fields(session)


def _route_to_etb_core(session: dict, reason: str | None = None) -> None:
    # A1a: ETB routes to bureau_consent as mandatory step (same as NTB)
    if ETB_REQUIRE_BUREAU_CONSENT:
        session["step"] = "offer"
        session["sub_step"] = "bureau_consent"
    else:
        session["step"] = "offer"
        session["sub_step"] = "eligible"  # Skip bureau if not required
    session["journeyMode"] = JOURNEY_MODE_ETB_CORE
    session["transitionReason"] = reason


def _route_to_ntb_enrichment(session: dict, reason: str | None = None) -> None:
    session["step"] = "identity"
    session["sub_step"] = "identify_yourself"
    session["journeyMode"] = JOURNEY_MODE_NTB_ENRICHMENT
    session["transitionReason"] = reason


def _can_enter_ntb_enrichment(session: dict) -> bool:
    customer_type = session.get("customerType", CUSTOMER_TYPE_UNKNOWN)
    journey_mode = session.get("journeyMode", JOURNEY_MODE_PRE_DEDUPE)
    return customer_type == CUSTOMER_TYPE_NTB or journey_mode == JOURNEY_MODE_NTB_ENRICHMENT


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

    # Local-first mode: keep routing fully session-driven unless explicitly enabled.
    if not _TEMPORAL_ENABLED:
        return

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

    _sync_customer_routing_fields(session)
    
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
            _set_customer_identity(session, id_number)
            session["collected"]["id_number"] = id_number
            session["collected"]["id_type"] = data.get("id_type", "national_id")
            session["sub_step"] = "nafath_pending"
            session["nafath_code"] = int(str(hash(id_number))[-2:].replace("-", "")) % 90 + 10
            logger.info(
                "ID received: %s, customerType: %s, nafath_code: %s",
                id_number,
                session.get("customerType"),
                session["nafath_code"],
            )

        elif data.get("nafath_approved") and current_sub == "nafath_pending":
            session["sub_step"] = "loading"
            logger.info("Nafath approved, transitioning to loading...")

        elif current_sub == "loading" and (data.get("loading_complete") or data.get("nafath_approved")):
            session["sub_step"] = "verified"
            logger.info("Verification complete")

        elif current_sub == "verified" and (data.get("identity_complete") or data.get("loading_complete") or data.get("continue")):
            session["sub_step"] = "dedupe_check"
            logger.info("Starting dedupe check...")

        elif current_sub == "dedupe_check" and data.get("dedupe_complete"):
            customer_type = session.get("customerType", CUSTOMER_TYPE_UNKNOWN)
            if customer_type == CUSTOMER_TYPE_ETB:
                _route_to_etb_core(session)
                logger.info(f"Dedupe identified ETB. Routing to {'bureau_consent' if ETB_REQUIRE_BUREAU_CONSENT else 'pre-approved offer'}.")
            else:
                _route_to_ntb_enrichment(session)
                logger.info("Dedupe identified NTB. Showing journey introduction.")

        elif current_sub == "identify_yourself":
            if not _can_enter_ntb_enrichment(session):
                logger.warning("Blocked invalid identify_yourself transition for session with customerType=%s journeyMode=%s", session.get("customerType"), session.get("journeyMode"))
                return
            if data.get("proceed"):
                session["sub_step"] = "personal_details"
                logger.info("NTB user proceeded. Showing personal details.")
            elif data.get("cancel"):
                session["step"] = "done"
                session["sub_step"] = "cancel"
                logger.info("User cancelled at identify_yourself.")

        elif (current_sub == "personal_details") and (data.get("identity_complete") or data.get("loading_complete") or data.get("continue") or data.get("modify_requested")):
            if data.get("modify_requested"):
                session["sub_step"] = "modify_section"
                logger.info("Customer requested profile modification.")
            else:
                # Step 7 is now mandatory before eligibility.
                session["sub_step"] = "expenses"
                session.setdefault("expenses", {})
                logger.info("Profile confirmed. Moving to expenses collection.")

        elif current_sub == "modify_section" and data.get("modify_section"):
            selected = str(data.get("modify_section", "")).strip().lower()
            if selected in {MODIFY_SECTION_PERSONAL, MODIFY_SECTION_ADDRESS, MODIFY_SECTION_EMPLOYMENT, MODIFY_SECTION_INCOME}:
                session["sub_step"] = f"modify_{selected}"
                logger.info("Customer selected modification section: %s", selected)

        elif current_sub in {"modify_personal", "modify_address"} and data.get("update_value"):
            section = "Personal details" if current_sub == "modify_personal" else "Address details"
            _begin_updating(session, section)
            logger.info("Captured %s update. Showing updating loader.", section)

        elif current_sub == "modify_employment":
            if data.get("document_uploaded") or data.get("update_value"):
                _begin_updating(session, "Employment details")
                logger.info("Employment details update received.")

        elif current_sub == "modify_income":
            if data.get("open_banking"):
                session["sub_step"] = "open_banking_email_sent"
                logger.info("Open Banking selected. Email step started.")
            elif data.get("upload_statement") and data.get("document_uploaded"):
                _begin_updating(session, "Income details", next_sub_step="expenses")
                logger.info("Income statement uploaded. Returning to expenses.")
            elif data.get("document_uploaded"):
                _begin_updating(session, "Income details", next_sub_step="expenses")
                logger.info("Income statement uploaded. Returning to expenses.")
            elif data.get("income_value"):
                customer_profile = session.get("customer_profile") or {}
                income = customer_profile.get("income") if isinstance(customer_profile, dict) else None
                if isinstance(income, dict):
                    income["monthly"] = f"SAR {int(data.get('income_value')):,}"
                _begin_updating(session, "Income details", next_sub_step="expenses")
                logger.info("Income updated manually. Returning to expenses.")

        elif current_sub == "open_banking_email_sent" and data.get("open_banking_linked"):
            _begin_updating(
                session,
                "Income details",
                auto_advance_ms=10000,
                next_signal="open_banking_complete",
                next_sub_step="expenses",
            )
            logger.info("Open Banking linked. Starting 10-second update loader.")

        elif current_sub == "updating_details" and (data.get("update_complete") or data.get("open_banking_complete")):
            updating = session.get("updating") or {}
            next_sub_step = updating.get("next_sub_step", "personal_details")
            if data.get("open_banking_complete"):
                customer_profile = session.get("customer_profile") or {}
                income = customer_profile.get("income") if isinstance(customer_profile, dict) else None
                if isinstance(income, dict):
                    income["monthly"] = "SAR 41,250"
                    income["obligations"] = "8750"
                session["expenses_prefilled"] = True
                session["expenses_total"] = 7560
            session["sub_step"] = next_sub_step
            session.pop("updating", None)
            logger.info("Update completed. Transitioned to %s.", next_sub_step)

        elif current_sub == "expenses" and data.get("expenses_confirmed"):
            total_expenses = data.get("total_expenses")
            session.setdefault("expenses", {})
            if total_expenses is not None:
                session["expenses"]["total"] = total_expenses
            elif session.get("expenses_prefilled"):
                session["expenses"]["total"] = session.get("expenses_total", 7560)

            session["sub_step"] = "bureau_consent"
            logger.info("Expenses captured. Moving to mandatory bureau consent.")

        elif current_sub == "bureau_consent":
            if data.get("bureau_consent_granted"):
                # Route based on journey mode (NTB vs ETB)
                journey_mode = session.get("journeyMode", JOURNEY_MODE_PRE_DEDUPE)
                if journey_mode == JOURNEY_MODE_ETB_CORE:
                    session["sub_step"] = "eligible"  # ETB → pre-approved offer
                    logger.info("ETB bureau consent granted. Moving to pre-approved offer.")
                else:
                    session["sub_step"] = "eligibility_check"  # NTB → eligibility check
                    logger.info("NTB bureau consent granted. Starting eligibility check.")
            elif data.get("bureau_consent_denied"):
                # Step 8 is mandatory: re-ask consent until granted.
                session["sub_step"] = "bureau_consent"
                logger.info("Bureau consent denied. Re-asking mandatory consent.")

        elif current_sub == "eligibility_check" and data.get("eligibility_check_complete"):
            # Calculate eligible amount using Formula-tab logic
            monthly_income = float(session.get("collected", {}).get("monthly_income", 35650))
            monthly_obligations = float(session.get("collected", {}).get("monthly_obligations", 8750))
            credit_card_limit = float(session.get("collected", {}).get("credit_card_limit", 20000))
            region = session.get("region", "SA")
            
            eligibility_result = calculate_max_eligible_amount(
                monthly_income, monthly_obligations, credit_card_limit, 60, region
            )
            
            session["step"] = "offer"
            session["step_number"] = 2
            session["sub_step"] = "eligible"
            session["journeyMode"] = JOURNEY_MODE_ETB_CORE if session.get("customerType") == CUSTOMER_TYPE_ETB else JOURNEY_MODE_NTB_ENRICHMENT
            session["offer"] = {
                "max_amount": eligibility_result["max_amount"],
                "profit_rate": "12%",
                "max_tenure": 60,
                "foir_status": eligibility_result["foir_status"],
            }
            logger.info(f"Eligibility check complete. Max eligible: {eligibility_result['max_amount']} SAR. Moving to eligible offer presentation.")

    # ═══════════════════════════════════════════
    # STEP 2: OFFER
    # ═══════════════════════════════════════════
    elif current_step == "offer":
        if current_sub == "eligible":
            if data.get("accepted_offer"):
                session["sub_step"] = "wants_more_decision"
                logger.info("Offer viewed. Moving to mandatory wants-more decision.")
            elif data.get("higher_amount_requested"):
                session["sub_step"] = "wants_more_decision"
                logger.info("Higher amount requested early. Redirecting to mandatory wants-more decision step.")

        elif current_sub == "wants_more_decision":
            if data.get("accepted_max_offer"):
                session["sub_step"] = "slider"
                logger.info("Customer accepted maximum amount. Moving to slider.")
            elif data.get("higher_amount_requested"):
                session["sub_step"] = "wants_more_open_banking"
                logger.info("Customer requested higher amount. Moving to open banking path.")

        elif current_sub == "wants_more_open_banking" and data.get("open_banking_linked"):
            session["sub_step"] = "wants_more_backoffice"
            session["backoffice_workitem"] = {
                "customerId": session.get("collected", {}).get("id_number", ""),
                "requestedAmount": session.get("requested_amount", "above_eligible_limit"),
                "maxEligible": session.get("offer", {}).get("max_amount", 0),
                "updatedIncome": "41250",
                "obligations": "8750",
                "timestamp": str(uuid.uuid4()),
                "branch": "Riyadh",
                "remarks": "Dummy workitem: customer requested amount above automatic eligible limit",
            }
            logger.info("Open banking linked for wants-more path. Dummy backoffice workitem created.")

        elif current_sub == "wants_more_backoffice" and data.get("accepted_max_offer"):
            session["sub_step"] = "slider"
            logger.info("Backoffice flow acknowledged. Moving to slider for current eligible amount.")

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
        if current_sub == "account":
            if data.get("account_selected") or data.get("iban_entered"):
                iban = data.get("account_selected") or data.get("iban_entered", "")
                session["selected_account"] = {"iban": iban}
                session["sub_step"] = "iban_validation"
                logger.info(f"Account selected: {iban}. Moving to IBAN validation.")
        
        elif current_sub == "iban_validation":
            if data.get("iban_validated"):
                # IBAN validation passed, store bank details
                session["selected_account"]["bank"] = data.get("bank", "")
                session["selected_account"]["beneficiary"] = data.get("beneficiary", "")
                session["sub_step"] = "application_summary"
                logger.info("IBAN validation complete. Moving to application summary.")
        
        elif current_sub == "application_summary":
            if data.get("application_confirmed"):
                session["sub_step"] = "ivr_consent"
                logger.info("Application summary confirmed. Moving to IVR consent choice.")
        
        elif current_sub == "ivr_consent":
            if data.get("otp_method") or data.get("ivr_method"):
                import datetime
                session["disbursement"] = {
                    "reference": f"PF-2025-{str(hash(session.get('collected', {}).get('id_number', '')))[:8].upper()}",
                    "date": datetime.datetime.now().strftime("%d %B %Y"),
                    "amount": session.get("finance_summary", {}).get("amount", 250000),
                    "account": session.get("selected_account", {}).get("iban", "****1234"),
                    "tenure": f"{session.get('finance_summary', {}).get('tenure', 36)} Months",
                    "profit_rate": session.get("finance_summary", {}).get("profit_rate", "15%"),
                    "first_installment": (datetime.datetime.now() + datetime.timedelta(days=90)).strftime("%d %B %Y"),
                    "monthly_installment": session.get("finance_summary", {}).get("monthly_installment", 4638),
                    "total_payable": session.get("finance_summary", {}).get("total_payable", 277968),
                }
                session["step"] = "done"
                session["sub_step"] = "complete"
                logger.info("IVR consent received. Disbursement confirmed, journey complete!")
