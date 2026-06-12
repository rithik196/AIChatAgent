Mobile App Process Flow Implementation Plan
Based on your detailed walkthrough and the provided Mobile app Process flow.xlsx, here is the plan to align the current project state with your expectations.

Current State Analysis
What's Working Properly
National ID collection (Step 1)
NAFATH push notification simulation (Step 2 & 3)
OTP Verification widgets (Step 4 & 5)
Dedupe check loader and classification into NTB/ETB (Step 6)
Initializing the 5-steps explanation widget (Needs UI update)
Fetching initial data from DB for Personal Details (Needs field completeness update)
What Needs Updating & Loops to Fix
Loops/Agent Chatter: The agent is asking redundant questions (e.g., asking "Which section do you want to modify?" when the widget already does this, and showing a personalized offer chat message during SIMAH consent).
Data Completeness: DB models and PersonalDetailsWidget need to include all fields specified in the Excel sheet.
Modification Flows:
Prefilled Data: All modification widgets will show prefilled data for the specific user before allowing them to update.
Address: Change widget to dropdowns for City/House Type. Full address input should happen via chat, not widget.
Employment: Remove file uploader from widget; handle document upload via chat bar. The document upload icon in the chat bar should only be enabled when specifically needed for employment verification or bank statement upload for income verification.
Income: Remove widget input; handle income input and proof selection (Bank Statement vs. Open Banking) via chat. If Open Banking is selected, show message: "An email has been sent to your registered ID. Please link your account". Then after 3 seconds, show a loader for updating details for 3 seconds, then show the updated income in the personal details tab.
Live Update: The main Personal Details widget must reflect updated data immediately without waiting for DB commit.
UI Makeovers: Multiple widgets need UI overhauls to match the provided designs (eligible_status, Backoffice_send_widget, accept_eligible_status, summary_amount, comodity_trade_screen, etc.).
ETB Pre-approved Flow: The ETB specific branch (Step 7.2 onwards) is currently missing the Pre-approved amount widget and the branching logic for "Go with offer" vs "Need higher amount".
Cross-Journey Logic: If an ETB customer selects "Need higher amount", they will be routed to the full NTB flow starting from the 5-step explanation.
Proposed Changes
Frontend (React/Widgets)
[MODIFY] 
NTBIntroductionWidget.tsx
Update UI to match 5 steps explained UI.png.
[MODIFY] 
PersonalDetailsWidget.tsx
Ensure all fields from Excel (Personal, Address, Employment, Income) are displayed.
Connect to live session state so updates made in sub-flows reflect immediately.
[MODIFY] 
ModifyAddressWidget.tsx
Ensure current data is pre-filled.
Replace text inputs for City and House Type with Dropdowns.
Remove the full address text area; the agent will prompt for this in chat.
[MODIFY] 
ModifyEmploymentWidget.tsx
Ensure current data is pre-filled.
Remove any standalone document uploader from this widget.
[MODIFY] 
ModifyIncomeWidget.tsx
Ensure current data is pre-filled.
Deprecate or modify to just show read-only fields, as income update and proof selection will move to chat.
[MODIFY] 
BureauConsentWidget.tsx
Clean up any stray chat text that appears simultaneously.
[MODIFY] 
EligibleOfferWidget.tsx
Overhaul UI to match eligible_status.png (for NTB) and pre_App_offer_ETB.png (for ETB).
Add "Need Higher Amount" and "Go with Offer" buttons for the ETB view.
[MODIFY] 
BackofficeWorkitemWidget.tsx
Overhaul UI to match Backoffice_send_widget.png.
[MODIFY] 
OfferSliderWidget.tsx
Overhaul UI to match accept_eligible_status.png.
Ensure max amount respects Pre-Approved amount for ETB.
[MODIFY] 
FinanceSummaryWidget.tsx
Overhaul UI to match summary_amount.png.
Ensure "Need higher amount" routes back to the slider.
[NEW] CommodityTradeAuthorizationWidget.tsx
New widget for Commodity Trade step to match comodity_trade_screen.png with a "Yes, I authorize" button.
[MODIFY] 
DocumentPreviewWidget.tsx
Add dummy PDF generation for Commodity Transaction Certificate (generate_comodity_cert.png).
Add E-Sign Contract and Promissory Note previews (generate_C&P_Note.png).
Ensure view/download functionality is clear.
[MODIFY] 
AccountSelectorWidget.tsx
Overhaul UI to match IBAN_show&select.png.
Update logic: if adding a new account, prompt user to type in chat instead of a widget text field.
[MODIFY] 
ApplicationSummaryWidget.tsx
Overhaul UI to match Summary_DetailsCard.png.
[NEW] Global Header Component
Add a Step Indicator on the header (Top Left) to match step_show.png (Steps 1 through 5).
Backend (LangGraph & API)
[MODIFY] 
chat.py
Update resolve_widget logic to handle the new CommodityTradeAuthorizationWidget.
Enable document upload in chat ONLY for Employment and Income (Bank Statement) verifications by setting allow_upload=True appropriately.
Update session profile in-memory instantly upon modification so PersonalDetailsWidget re-renders correctly.
[MODIFY] agent/graph/state.py (or equivalent)
Update state schema to track the ETB vs NTB sub-flows properly, particularly the wants_more flag from the ETB pre-approved offer.
[MODIFY] agent/prompts/ (System Prompts)
Remove Redundancy: Stop the agent from asking "Which section to modify?" in text when the modify widget handles it.
Address Flow: Instruct agent to ask for new full address in chat after widget submission.
Employment Flow: Instruct agent to ask for document upload via chat after widget submission. Enable chat bar upload.
Income Flow: Instruct agent to ask for updated income value in chat, then ask for proof preference (Bank Statement vs Open Banking). Enable chat bar upload for Bank Statement.
Open Banking Logic: Instruct the agent to reply "An email has been sent to your registered ID. Please link your account" followed by a 3-second loader, then update the details.
SIMAH Consent: Remove the hardcoded personalized offer text from the prompt during the consent step.
Commodity/E-Sign/IBAN/IVR: Add the specific simulation loaders (3 sec for commodity, 5 sec for e-sign email, 10 sec for IVR) as defined in the prompt.
ETB Logic: Instruct agent on the ETB branching logic (Route to NTB Step 7.1 if "Need higher amount" is requested on the pre-approved offer).
[MODIFY] 
db.py
Ensure the CustomerProfile models contain all fields defined in the Excel Field Requirements sheet (e.g., missing address details, exact income types).
Verification Plan
Manual Verification
Walk through the NTB Journey from start to finish.
Verify Personal Details Modification flows (prefilled widgets, Address in chat, Employment doc upload, Income open banking flow).
Verify UI changes for Eligibility, Slider, Finance Summary, Commodity Trade, Documents, and IBAN.
Verify OTP/IVR final verification.
Walk through the ETB Journey from start to finish.
Verify Pre-approved offer is shown immediately after Dedupe.
Verify "Go with offer" routes directly to SIMAH consent.
Verify "Need higher amount" routes into the NTB data enrichment flow starting from 5-steps.
Verify the Max amount in the slider is capped at the pre-approved amount.
Validate that the UI matches the design guidelines across all updated widgets.