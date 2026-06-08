# Current RLOS Project Flow Walkthrough

This guide explains the current project flow step by step, using the
National ID journey as the main example.

The key idea:

```text
User speaks/types ID on UI
-> frontend sends chat message
-> backend proxies to agent
-> agent classifies and extracts ID
-> session state advances
-> backend resolves widget
-> frontend renders next action
```

## 1. Big Picture

The project is a Retail Loan Origination System (RLOS). The customer chats
with an AI finance assistant named Raya. Raya guides the customer through a
loan journey.

The repo is split into these major parts:

| Folder | Role |
| --- | --- |
| `frontend/` | Customer-facing Next.js app. Shows login, chat, voice button, widgets, and journey UI. |
| `backend/` | FastAPI gateway. Receives chat from frontend, calls the agent, resolves widgets, streams response back. |
| `agent/` | LangGraph AI brain. Classifies user input, extracts structured data, advances journey state, builds AI response. |
| `workflow/` | Temporal workflow. Models the durable loan process and mocked external steps like Nafath, SIMAH, e-sign, and disbursement. |
| `shared/` | Shared constants and Pydantic models used across agent/workflow. |
| `voice/` | Future server-side voice pipeline scaffold. Current UI voice does not use this service. |

Current runtime shape:

```text
Frontend Next.js      -> port 3000
Backend FastAPI       -> port 8000
Agent FastAPI         -> port 8001
Temporal              -> port 7233
Voice scaffold        -> port 8002, not active in current UI flow
```

## 2. Login And Session Setup

Before the user reaches the loan journey, they go through login.

1. The user opens `/login`.
2. The login UI asks for phone and mock OTP.
3. The backend auth endpoint creates a `raya_session` HTTP-only cookie.
4. After login, the user selects a product, for example `cash_finance`.
5. The frontend redirects to the journey page:

```text
/{product}
```

Example:

```text
/cash_finance
```

Inside `frontend/src/app/(journey)/[product]/page.tsx`, the page checks auth:

```text
fetch("/api/auth/me")
```

If the user is authenticated, the page builds a stable chat session ID:

```text
sessionId = `${phone}_${product}`
```

Example:

```text
8123456789_cash_finance
```

That `sessionId` is important because it connects all messages, state,
history, widgets, and agent memory for this customer journey.

## 3. Voice Is Converted To Text In The Browser

Current voice flow is simple:

```text
User speaks
-> browser Web Speech API converts speech to text
-> text is sent through the normal chat path
```

The active voice code is in:

```text
frontend/src/hooks/useVoice.ts
```

That hook uses:

```text
window.SpeechRecognition
window.webkitSpeechRecognition
```

When final speech text is detected, it calls:

```text
onTranscript(final.trim())
```

In `frontend/src/app/(journey)/[product]/page.tsx`, `onTranscript` sends it to
chat:

```text
sendMessage({ text })
```

Important current-state point:

The backend does not receive audio today. It only receives the converted text.
So if the customer speaks `1234567890`, the backend sees the same thing as if
the user typed `1234567890`.

The `voice/` service exists, but it is only a scaffold for a future real-time
server-side voice pipeline.

## 4. National ID Flow: Step By Step

This is the main current journey example.

### Step 4.1: UI Starts On Identity

When there is no previous conversation history, the frontend shows a welcome
message:

```text
Welcome to the cash finance application! I am Raya, your Agentic Finance Advisor.
To get started, could you please provide your National ID?
```

This comes from:

```text
frontend/src/app/(journey)/[product]/page.tsx
```

The current initial backend session state is:

```json
{
  "region": "SA",
  "step": "identity",
  "sub_step": "awaiting_id",
  "step_number": 1,
  "total_steps": 5,
  "product": "cash_finance",
  "user_type": "unknown",
  "collected": {}
}
```

### Step 4.2: User Speaks Or Types National ID

Example user input:

```text
My national ID is 1234567890
```

If typed, the form submit calls:

```text
sendMessage({ text: input })
```

If spoken, `useVoice.ts` converts speech to text and then calls the same:

```text
sendMessage({ text })
```

So both typed and spoken input enter the same chat path.

### Step 4.3: Frontend API Route Proxies The Message

The `useChat` hook sends the message to the local Next.js route:

```text
frontend/src/app/api/chat/route.ts
```

This route:

1. Reads the request body from the AI SDK.
2. Reads the `raya_session` cookie.
3. Gets `sessionId` from header/body or derives it.
4. Converts AI SDK message parts into simple `{ role, content }` messages.
5. Calls the backend gateway:

```text
POST http://localhost:8000/api/chat
```

Payload shape:

```json
{
  "session_id": "8123456789_cash_finance",
  "messages": [
    {
      "role": "user",
      "content": "My national ID is 1234567890"
    }
  ]
}
```

### Step 4.4: Backend Gateway Receives Chat

The backend endpoint is:

```text
backend/api/chat.py
POST /api/chat
```

The backend keeps an in-memory `SESSION_STORE`.

If this session is new, it creates the identity state:

```json
{
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
  "_lastWidgetState": "identity/awaiting_id"
}
```

Then the backend calls the agent:

```text
POST http://localhost:8001/invoke
```

It sends:

```json
{
  "session_id": "8123456789_cash_finance",
  "messages": [...],
  "session": {
    "step": "identity",
    "sub_step": "awaiting_id"
  }
}
```

### Step 4.5: Agent Receives The Request

The agent endpoint is:

```text
agent/main.py
POST /invoke
```

The agent loads the current session from:

1. in-memory `SESSION_CACHE`
2. file persistence via `get_session`
3. incoming backend session defaults

Then it creates a LangGraph state:

```json
{
  "messages": [...],
  "session": {...},
  "last_response": "",
  "extract": null
}
```

Then it runs:

```text
agent_app.ainvoke(state)
```

The graph is:

```text
classify -> extract -> respond
```

### Step 4.6: Agent Classifies The National ID

Classification happens in:

```text
agent/graph/nodes.py
classify_intent()
```

For identity step and `awaiting_id` sub-step, the agent first tries a
deterministic regex:

```text
\b([12]\d{9})\b
```

This means the current valid ID format is:

```text
exactly 10 digits
first digit must be 1 or 2
```

Examples:

| ID | Current behavior |
| --- | --- |
| `1234567890` | valid, treated as National ID / existing-style ID |
| `2123456789` | valid, treated as Iqama / new-style ID |
| `9876543210` | invalid because it does not start with `1` or `2` |
| `12345` | invalid because it is not 10 digits |

For `1234567890`, the classifier returns:

```json
{
  "step": "identity",
  "intent": "STEP_DATA",
  "data": {
    "id_number": "1234567890",
    "id_type": "national_id"
  }
}
```

If deterministic matching fails, the code can fall back to GPT-4o-mini for
classification. But for a clear 10-digit ID, no LLM is needed for extraction.

### Step 4.7: Agent Extracts And Advances State

Extraction happens in:

```text
agent/graph/nodes.py
extract_data()
```

It builds this extract:

```json
{
  "step": "identity",
  "intent": "STEP_DATA",
  "data": {
    "id_number": "1234567890",
    "id_type": "national_id"
  }
}
```

Then it calls:

```text
agent/extractors/router.py
route_to_temporal()
```

This function does two things:

1. Advances local session state.
2. Tries to send a Temporal signal.

The local state advancement happens first:

```text
_advance_session_state(extract, session)
```

For National ID, this code validates again:

```text
len(id_number) == 10
id_number[0] in ("1", "2")
id_number.isdigit()
```

Then it detects user type:

```text
agent/extractors/router.py
detect_user_type()
```

Current rules:

```text
IDs in EXISTING_USER_IDS -> existing
IDs starting with "1"    -> existing
Everything else          -> new
```

Current demo existing IDs:

```text
1234567890
1111111111
1987654321
```

For `1234567890`, the session becomes:

```json
{
  "step": "identity",
  "sub_step": "nafath_pending",
  "user_type": "existing",
  "collected": {
    "id_number": "1234567890",
    "id_type": "national_id"
  },
  "nafath_code": 10
}
```

The exact `nafath_code` is generated from the ID hash, so it may vary.

### Step 4.8: Temporal Signal Is Attempted

Still inside:

```text
agent/extractors/router.py
route_to_temporal()
```

The agent tries to connect to Temporal:

```text
localhost:7233
```

If Temporal is available, it starts or reuses a workflow and sends:

```text
identity_received
```

with:

```json
{
  "id_number": "1234567890",
  "id_type": "national_id"
}
```

The workflow code is in:

```text
workflow/workflows/rlos_workflow.py
```

The workflow waits for identity:

```text
AWAITING_IDENTITY
```

Then runs mocked Nafath:

```text
workflow/activities/mock_activities.py
mock_nafath_push()
```

Important current-state point:

Temporal is optional in practice. If Temporal is not running, the agent logs a
warning and continues using session-based state. The UI journey can still move
forward without Temporal.

### Step 4.9: Agent Builds The Customer Response

After extraction, the graph runs:

```text
agent/graph/nodes.py
build_response()
```

It builds a dynamic system prompt using:

```text
agent/prompts/builder.py
```

Because the updated session is now:

```text
identity / nafath_pending
```

the prompt tells Raya to ask the customer to open Nafath and approve the
request.

Then the agent returns:

```json
{
  "response": "Thank you. I've sent a request to your Nafath app...",
  "session": {
    "step": "identity",
    "sub_step": "nafath_pending",
    ...
  },
  "extract": {
    "data": {
      "id_number": "1234567890"
    }
  }
}
```

### Step 4.10: Backend Resolves The Nafath Widget

The backend receives the agent response in:

```text
backend/api/chat.py
```

It compares previous widget state:

```text
identity/awaiting_id
```

with new widget state:

```text
identity/nafath_pending
```

Because the state changed, it calls:

```text
resolve_widget(updated_session, data.get("extract"))
```

For:

```text
step = identity
sub_step = nafath_pending
```

it returns:

```json
{
  "widget": "NafathWidget",
  "data": {
    "nafath_code": 10
  }
}
```

Then it updates:

```text
_lastWidgetState = "identity/nafath_pending"
```

Important current-state point:

Widgets are only emitted when `step/sub_step` changes. If the user sends
another message while still in the same state, the same widget is not emitted
again.

### Step 4.11: Backend Streams Text And Widget To Frontend

The backend does not return one normal JSON response. It streams Server-Sent
Events using the AI SDK v6 UI message stream format.

In:

```text
backend/api/chat.py
_build_sse_stream()
```

the stream looks like:

```text
start
start-step
text-start
text-delta
text-delta
text-end
message-metadata(widget)
finish-step
finish
[DONE]
```

The widget is attached as message metadata:

```json
{
  "type": "message-metadata",
  "messageMetadata": {
    "widget": {
      "widget": "NafathWidget",
      "data": {
        "nafath_code": 10
      }
    }
  }
}
```

### Step 4.12: Frontend Renders Text And Widget

The streamed response returns to:

```text
frontend/src/app/api/chat/route.ts
```

That route passes the stream back to the browser.

The chat UI renders messages through:

```text
frontend/src/components/chat/ChatWindow.tsx
frontend/src/components/chat/MessageBubble.tsx
```

`MessageBubble.tsx` checks:

```text
metadata?.widget
```

Then it maps the widget name using:

```text
WIDGET_REGISTRY
```

For:

```text
NafathWidget
```

it renders:

```text
frontend/src/components/widgets/NafathWidget.tsx
```

That widget shows the Nafath code and an `Open Nafath App` button.

When the user clicks that button, the widget dispatches:

```text
mock-send-message
```

with:

```text
Open Nafath App
```

The journey page listens for this event and sends it as a chat message:

```text
sendMessage({ text: "Open Nafath App" })
```

Then the same frontend -> backend -> agent flow repeats.

## 5. Identity Sub-Step Flow

The current identity flow is:

```text
identity/awaiting_id
-> identity/nafath_pending
-> identity/loading
-> identity/verified
-> identity/personal_details
-> offer/eligible
```

### 5.1 `identity/awaiting_id`

Meaning:

```text
Raya is waiting for the customer to provide National ID or Iqama.
```

Expected user input:

```text
1234567890
My ID is 1234567890
```

Code that advances it:

```text
agent/extractors/router.py
_advance_session_state()
```

Next state:

```text
identity/nafath_pending
```

Widget:

```text
NafathWidget
```

### 5.2 `identity/nafath_pending`

Meaning:

```text
The ID was accepted. A Nafath verification request is shown to the customer.
```

Expected user input:

```text
done
approved
Open Nafath App
confirmed
yes
ok
verify
```

Code that detects this:

```text
agent/graph/nodes.py
_deterministic_classify()
```

Next state:

```text
identity/loading
```

Widget:

```text
LoadingWidget
```

### 5.3 `identity/loading`

Meaning:

```text
The app is pretending to verify identity and fetch records.
```

Expected user input:

```text
done
ok
yes
continue
next
proceed
```

Current behavior:

Any non-empty message can also advance this state.

Next state:

```text
identity/verified
```

Widget:

```text
VerificationSuccessWidget
```

### 5.4 `identity/verified`

Meaning:

```text
Identity verification is complete.
```

Expected user input:

```text
continue
next
ok
```

Next state:

```text
identity/personal_details
```

Widget:

```text
PersonalDetailsWidget
```

### 5.5 `identity/personal_details`

Meaning:

```text
The customer sees personal details and confirms they are correct.
```

Expected user input:

```text
yes
continue
proceed
```

Next state:

```text
offer/eligible
```

Widget:

```text
EligibleOfferWidget
```

## 6. Current Data Reality

This is important before adding new features.

### National ID does not fetch real personal data

The current project does not call a real government, MOI, Yakeen, Nafath,
SIMAH, or core banking API based on National ID.

Instead:

1. ID validation is local.
2. User type is guessed from the ID.
3. Nafath is mocked.
4. Personal details shown by the backend widget are hardcoded demo data.
5. `backend/db.py` contains one demo customer profile keyed by phone number,
   not by National ID.

### Existing vs new user is demo logic

Current logic:

```text
1234567890, 1111111111, 1987654321 -> existing
any ID starting with 1              -> existing
any valid ID starting with 2        -> new
```

So this is not real dedupe yet. It is placeholder logic.

### Temporal is useful but not required for current UI progress

The state machine advances before Temporal signaling. If Temporal fails, the
router returns after logging:

```text
Temporal unavailable, using session-based state
```

That means the visible chat journey can continue even when the workflow engine
is not running.

## 7. Full Journey After Identity

After identity, the project continues with these steps.

### Offer

State flow:

```text
offer/eligible
-> offer/slider
-> offer/summary
-> trade/loading
```

Main widgets:

```text
EligibleOfferWidget
OfferSliderWidget
FinanceSummaryWidget
```

Where logic lives:

```text
agent/extractors/router.py
backend/api/chat.py
frontend/src/components/widgets/
```

### Trade

State flow:

```text
trade/loading
-> trade/success
-> esign/documents
```

Main widgets:

```text
LoadingWidget
VerificationSuccessWidget
```

This simulates a commodity/Murabaha trade.

### E-Sign

State flow:

```text
esign/documents
-> esign/otp_ivr
-> disburse/account
```

Main widgets:

```text
DocumentPreviewWidget
OtpVerificationWidget
```

The document widget can send:

```text
E-Sign via Nafath
```

as a mock chat message.

### Disbursement

State flow:

```text
disburse/account
-> done/complete
```

Main widgets:

```text
AccountSelectorWidget
DisbursementWidget
```

The account selector can send:

```text
ACCOUNT_SELECTED::<IBAN>
```

as a deterministic signal.

## 8. Where To Add New Things

Use this section when you start implementing future requirements.

### Add a new journey step or sub-step

Change:

```text
agent/extractors/router.py
```

This is where the session state machine advances.

Also update:

```text
agent/prompts/builder.py
agent/prompts/master_prompt.py
agent/prompts/step_goals.py
backend/api/chat.py
frontend/src/components/journey/
```

### Add new extraction rules

Change:

```text
agent/graph/nodes.py
```

Look for:

```text
_deterministic_classify()
```

For simple button text, IDs, confirmations, IBANs, and numeric choices, add
deterministic parsing here.

For more ambiguous natural language, update:

```text
_build_classify_prompt()
```

and the relevant prompt schemas.

### Add a new widget

Create a component in:

```text
frontend/src/components/widgets/
```

Register it in:

```text
frontend/src/components/chat/MessageBubble.tsx
WIDGET_REGISTRY
```

Return it from:

```text
backend/api/chat.py
resolve_widget()
```

### Add backend validation

For journey/session validation, change:

```text
agent/extractors/router.py
```

For API request validation, change:

```text
backend/api/chat.py
backend/models/
```

For real customer lookup, replace or extend:

```text
backend/db.py
backend/api/profile.py
```

### Add real external integrations

The mock workflow activities are in:

```text
workflow/activities/mock_activities.py
```

Real integrations would likely replace or wrap:

```text
mock_nafath_push()
mock_simah_pull()
mock_docusign_send()
mock_core_banking_transfer()
```

## 9. Future Excel Handling

The file:

```text
C:\Users\rithik.j\Downloads\Mobile app Process flow.xlsx
```

should be treated as the future-state plan, not the current-state truth.

Known sheets:

```text
Process Flow
Field Requirements
Customer Master
Formula
IBAN Master
Dropdown Values
Master Data, Questions
```

Recommended next phase:

1. Read `Process Flow` and identify each required screen/decision.
2. Compare each future step to the current state machine in `agent/extractors/router.py`.
3. Compare required fields to current widgets and backend models.
4. Identify missing validations.
5. Identify real data sources needed instead of current mock data.
6. Convert the gap list into implementation tasks.

## 10. Acceptance Check

After reading this, you should be able to answer these questions.

### When I speak a National ID, which file receives it first?

```text
frontend/src/hooks/useVoice.ts
```

The browser converts speech to text. Then:

```text
frontend/src/app/(journey)/[product]/page.tsx
```

sends that text through `sendMessage`.

### Which backend endpoint handles it?

First the Next.js proxy:

```text
frontend/src/app/api/chat/route.ts
```

Then the backend gateway:

```text
backend/api/chat.py
POST /api/chat
```

Then the agent:

```text
agent/main.py
POST /invoke
```

### Where is National ID validated?

First classification detects the ID in:

```text
agent/graph/nodes.py
_deterministic_classify()
```

Then state advancement validates it in:

```text
agent/extractors/router.py
_advance_session_state()
```

Current validation:

```text
10 digits, starts with 1 or 2
```

### Where does state change?

```text
agent/extractors/router.py
_advance_session_state()
```

For National ID:

```text
identity/awaiting_id -> identity/nafath_pending
```

### Why does the Nafath widget appear?

Because the backend sees that state changed from:

```text
identity/awaiting_id
```

to:

```text
identity/nafath_pending
```

Then:

```text
backend/api/chat.py
resolve_widget()
```

returns:

```text
NafathWidget
```

The frontend renders it through:

```text
frontend/src/components/chat/MessageBubble.tsx
```

using:

```text
WIDGET_REGISTRY
```

## 11. Short Mental Model

Keep this model in your head when adding new features:

```text
Frontend collects user action
-> Next.js route normalizes message
-> Backend sends message + session to agent
-> Agent classifies/extracts
-> Router advances step/sub_step
-> Backend maps step/sub_step to widget
-> SSE stream sends text + widget
-> MessageBubble renders widget
```

Most new journey behavior will require changes in three places:

```text
agent/extractors/router.py     # state movement
backend/api/chat.py            # widget selection
frontend/src/components/widgets # visible UI
```

If the user input is new or more complex, also update:

```text
agent/graph/nodes.py           # intent/data extraction
agent/prompts/                 # Raya's instructions
```
