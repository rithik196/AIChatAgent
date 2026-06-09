import json
from datetime import datetime
from prompts.master_prompt import MASTER_SYSTEM_PROMPT
from prompts.step_goals import STEP_GOALS, EXTRACTION_SCHEMAS
from prompts.regulatory import REGULATORY_PROFILES

def build_system_prompt(session: dict) -> str:
    region = session.get("region", "SA")
    step = session.get("step", "identity")
    sub_step = session.get("sub_step", "awaiting_id")
    user_type = session.get("user_type", "unknown")
    
    step_goal = STEP_GOALS.get(step, "Continue the journey naturally")
    if isinstance(step_goal, dict):
        step_goal = step_goal.get(region, step_goal.get("SA", ""))
    
    schema = EXTRACTION_SCHEMAS.get(step, '{}')
    if isinstance(schema, dict):
        schema = schema.get(region, schema.get("SA", '{}'))

    # Sub-step specific instructions
    sub_step_instructions = _get_sub_step_instructions(step, sub_step, user_type)

    return f"""
{MASTER_SYSTEM_PROMPT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT SESSION CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timestamp:          {datetime.utcnow().isoformat()}
Region:             {region}
Regulator:          {REGULATORY_PROFILES.get(region, '')}
Channel:            {session.get('channel', 'text')}
Language:           {session.get('language', 'auto-detect')}
Customer Name:      {session.get('customer_name', 'valued customer')}
Product:            {session.get('product', 'cash_finance')}
User Type:          {user_type}
Current Step:       {step} ({session.get('step_number', 1)} of {session.get('total_steps', 5)})
Current Sub-Step:   {sub_step}
Step Goal:          {step_goal}
Extraction Schema:  {schema}
Failed Attempts:    {session.get('failed_attempts', 0)} of 3
Data Collected:     {json.dumps(session.get('collected', {}), indent=2, ensure_ascii=False)}
Current Offer:      {json.dumps(session.get('offer', {}), indent=2, ensure_ascii=False)}
Finance Summary:    {json.dumps(session.get('finance_summary', {}), indent=2, ensure_ascii=False)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUB-STEP INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{sub_step_instructions}
    """.strip()


def _get_sub_step_instructions(step: str, sub_step: str, user_type: str) -> str:
    """Return specific instructions based on step + sub_step."""
    
    instructions = {
        ("identity", "awaiting_id"): """
You are at the beginning of the journey.
- Greet the customer warmly and ask for their 10-digit National ID or Iqama number.
- Extract: {"id_number": "the number", "id_type": "national_id or iqama"}
""",
        ("identity", "nafath_pending"): """
The customer has provided their ID. A Nafath verification request has been sent.
- Tell them: "I've sent a request to your Nafath app to securely verify your identity. Please open Nafath app and select the number displayed to continue."
- DO NOT advance to the next step yet. Wait for Nafath approval confirmation.
- When customer confirms (e.g., "done", "approved", "Open Nafath App"): Extract: {"nafath_approved": true}
""",
        ("identity", "loading"): """
The customer has approved Nafath. Verification is in progress.
- Briefly acknowledge: "Verifying your identity now..."
- The system will show a loading widget automatically.
- Extract: {"verification_loading": true}
""",
        ("identity", "verified"): """
Identity verification is complete!
- Congratulate the customer.
- The system will run a dedupe check next.
- DO NOT mention offers, limits, profit rates, or tenures in this sub-step.
- Extract: {"identity_complete": true}
""",
        ("identity", "dedupe_check"): """
The system is running a dedupe check to verify existing records.
- Briefly acknowledge: "Running dedupe check to verify your records..."
- The system will show a loading widget automatically.
- DO NOT mention offers until dedupe is completed.
- Extract: {"dedupe_complete": true} when you receive the dedupe complete signal.
""",
        ("identity", "identify_yourself"): """
The customer is viewing the Journey Overview for onboarding.
- The system will show a widget with the 5 steps of the journey and ask if they would like to proceed.
- You must wait for the customer to confirm their intent. 
- If they type or say "Yes", "Proceed", "Okay", etc., extract: {"proceed": true}.
- If they type or say "No", "Cancel", etc., extract: {"cancel": true}.
""",
        ("identity", "personal_details"): """
CRITICAL INSTRUCTION: You are currently showing the customer their Personal Details.
DO NOT present any finance offers yet! You must wait for the customer to confirm their details first.
- The system is showing a widget with the customer's personal details.
- Say exactly: "I have retrieved your current profile details. Please review them to make sure everything is correct to proceed."
- DO NOT mention any loan amounts, profit rates, or tenures at this stage.
- Extract: {"identity_complete": true} when they confirm the details are correct.
""",
        ("identity", "modify_section"): """
The customer asked to modify details.
- Ask which section they want to modify: Personal, Address, Employment, or Income.
- Extract: {"modify_section": "personal|address|employment|income"}
""",
        ("identity", "modify_personal"): """
Collect updated Personal Details fields from the customer.
- Extract any provided value as: {"update_value": "..."}
""",
        ("identity", "modify_address"): """
Collect updated Address Details from the customer.
- Extract any provided value as: {"update_value": "..."}
""",
        ("identity", "modify_employment"): """
Collect updated Employment Details from the customer.
- Ask for document upload if needed.
- Extract any provided value as: {"update_value": "..."}
""",
        ("identity", "modify_income"): """
Collect updated Income Details.
- Offer 3 options: manual income update, upload bank statement, or Open Banking.
- Extract: {"income_value": number} for manual updates.
- Extract: {"upload_statement": true} for upload path.
- Extract: {"open_banking": true} for Open Banking path.
""",
        ("identity", "open_banking_email_sent"): """
Open Banking email has been sent.
- Ask customer to link account and confirm when done.
- Extract: {"open_banking_linked": true}
""",
        ("identity", "updating_details"): """
System is updating customer details.
- Keep response minimal.
- Extract: {"update_complete": true} when update completion signal arrives.
""",
        ("identity", "expenses"): """
Ask customer to confirm monthly expenses (Step 7).
- Extract: {"expenses_confirmed": true, "total_expenses": number}
""",
        ("offer", "eligible"): f"""
Present the pre-approved/eligible finance offer.
- {"This is an EXISTING customer — present as 'Pre Approved Offer'" if user_type == 'existing' else "This is a NEW customer — present as 'Eligible Finance Offer'"}
- Mention the maximum eligible amount, profit rate, and tenure
- Ask if they want to accept or request a higher amount
- If they accept the offer: Extract: {{"accepted_offer": true}}
- If they request a higher amount or want to change it to a higher value: Extract: {{"higher_amount_requested": true}}
""",
        ("offer", "slider"): """
The customer has accepted the offer. Now let them configure the exact amount and tenure.
- Tell them to adjust the amount and tenure sliders to their preference.
- Extract: {"loan_amount": number, "tenure_months": number}
""",
        ("offer", "summary"): """
Show the complete finance summary with all calculated values.
- Present: Finance Amount, Repayment Period, Annual Profit Rate, Monthly Installment, Total Amount Payable
- Ask if they want to proceed to commodity trade or modify
- Extract: {"proceed_trade": true} when they proceed
""",
        ("trade", "loading"): """
The commodity trade (Murabaha) is being executed.
- Explain that the commodity trade ensures Shariah compliance.
- The system will show a loading widget.
- Extract: {"trade_executing": true}
""",
        ("trade", "success"): """
The commodity trade was successful!
- Inform the customer the trade is complete.
- Ask for their authorization to proceed.
- Extract: {"confirmed": true} when they authorize
""",
        ("esign", "documents"): """
Present the documents for digital signing.
- Mention the Contract Letter and Promissory Note
- Tell customer signed copies will be sent to their email
- Extract: {"esign_nafath": true} when they click E-Sign via Nafath
""",
        ("esign", "otp_ivr"): """
E-Sign is successful! Now ask for final verification method.
- Ask customer to choose OTP or IVR verification for disbursement authorization
- Extract: {"otp_method": "otp" or "ivr"}
""",
        ("disburse", "account"): """
Ask the customer to select their bank account for disbursement.
- Present available accounts
- Extract: {"account_confirmed": true, "account_number": "selected IBAN"}
""",
        ("done", "complete"): """
Journey is complete! Congratulate the customer.
- Share the disbursement details and reference number.
- Inform about welcome letter and repayment schedule.
- Provide bank contact information.
- Thank them sincerely.
""",
    }
    
    key = (step, sub_step)
    return instructions.get(key, f"Continue the {step} step naturally. Current sub-step: {sub_step}")
