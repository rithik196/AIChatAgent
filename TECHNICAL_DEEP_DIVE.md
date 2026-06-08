# Technical Deep-Dive: How Everything Works

This document explains each technology/pattern used in this project, how it technically works, and why the project uses it.

---

## Table of Contents

1. [LangGraph (AI Agent Pipeline)](#1-langgraph-ai-agent-pipeline)
2. [Temporal Workflow (Durable Execution)](#2-temporal-workflow-durable-execution)
3. [SSE Streaming (Server-Sent Events)](#3-sse-streaming-server-sent-events)
4. [FastAPI (Python Web Framework)](#4-fastapi-python-web-framework)
5. [Next.js App Router (Frontend Routing)](#5-nextjs-app-router-frontend-routing)
6. [AI SDK useChat Hook (Chat State Manager)](#6-ai-sdk-usechat-hook-chat-state-manager)
7. [State Machine Pattern (Session Flow Control)](#7-state-machine-pattern-session-flow-control)
8. [System Prompt Engineering (Dynamic LLM Instructions)](#8-system-prompt-engineering-dynamic-llm-instructions)
9. [Docker Compose (Infrastructure)](#9-docker-compose-infrastructure)
10. [Web Speech API (Browser Voice)](#10-web-speech-api-browser-voice)
11. [Cookie-Based Auth (Session Security)](#11-cookie-based-auth-session-security)
12. [Widget System (Rich Chat UI)](#12-widget-system-rich-chat-ui)
13. [OpenAI API (LLM Calls)](#13-openai-api-llm-calls)
14. [File-Based Persistence (Dev Storage)](#14-file-based-persistence-dev-storage)

---

## 1. LangGraph (AI Agent Pipeline)

### What is it?

LangGraph is a library by LangChain for building **stateful, multi-step AI workflows as directed graphs**. Instead of one big function calling the LLM, you break it into separate steps (nodes) that pass data through a shared state.

### How does it technically work?

- A `StateGraph` is initialized with a **typed state schema** (a Python `TypedDict`)
- You register **nodes** — each node is an async function that reads the current state and returns partial updates
- **Edges** define execution order (who runs after whom)
- `compile()` produces a runnable graph
- When invoked, each node receives the FULL state and returns only the keys it wants to update — LangGraph merges these back automatically

Think of it like a factory assembly line: each station (node) does one job and passes the product (state) forward.

### How this project uses it

**File: `agent/graph/graph.py`**
```python
workflow = StateGraph(ConversationState)

# Register 3 nodes
workflow.add_node("classify", classify_intent)
workflow.add_node("extract", extract_data)
workflow.add_node("respond", build_response)

# Connect them in order
workflow.set_entry_point("classify")
workflow.add_edge("classify", "extract")
workflow.add_edge("extract", "respond")
workflow.add_edge("respond", END)

graph = workflow.compile()
```

**File: `agent/graph/state.py`** — The shared state:
```python
class ConversationState(TypedDict):
    messages: List[Dict[str, Any]]       # Chat history
    session: Dict[str, Any]              # Current session state
    last_response: str                   # AI's response text
    extract: Optional[Dict[str, Any]]    # Extracted data from user
    intent: Optional[str]                # Classified intent
    classified_data: Optional[Dict[str, Any]]  # Classification details
```

**The 3-node pipeline:**
```
User Message → [classify_intent] → [extract_data] → [build_response] → AI Reply
```

1. **classify_intent** — Figures out what the user meant (regex first, LLM fallback)
2. **extract_data** — Pulls structured data out, advances the state machine, sends Temporal signals
3. **build_response** — Calls GPT-4o-mini with dynamic prompt → produces the reply

### Why use it?

- **Separation of concerns**: Classification doesn't need to know about prompt building
- **Debuggability**: You can inspect state between nodes
- **Extensibility**: Adding a new step (e.g., guardrails) = adding one node + one edge
- **State management**: LangGraph handles merging partial updates automatically

---

## 2. Temporal Workflow (Durable Execution)

### What is it?

Temporal is a **durable execution platform**. It guarantees that long-running business processes complete even if servers crash, restart, or lose network. Your code looks like normal sequential code, but Temporal persists each step.

### How does it technically work?

| Concept | Explanation |
|---------|-------------|
| **Workflow** | Orchestration logic (like a conductor). Deterministic — no random, no time, no I/O directly. Can run for days/months. |
| **Activity** | A single unit of work with side effects (API calls, DB writes). Has retries and timeouts. |
| **Signal** | An external message sent INTO a running workflow to wake it up or give it data. |
| **Worker** | A process that polls Temporal for tasks and executes workflows/activities. |
| **Task Queue** | A named channel — you start a workflow on a queue, workers listening on that queue pick it up. |

**Flow:**
```
Start Workflow → Worker picks it up → Workflow runs until wait_condition
→ Signal arrives → Workflow continues → Executes activity → Wait again → ...
```

If the worker crashes, Temporal replays the workflow from its event history (like a video game checkpoint system).

### How this project uses it

**File: `workflow/workflows/rlos_workflow.py`**
```python
@workflow.defn
class RLOSWorkflow:
    def __init__(self):
        self.state = "STARTED"
        self.identity_data = None
        self.offer_data = None
        # ... more signal data holders

    @workflow.signal
    def identity_received(self, data: dict):
        self.identity_data = data

    @workflow.signal
    def offer_selected(self, data: dict):
        self.offer_data = data

    @workflow.run
    async def run(self, input: LoanInput) -> dict:
        # Step 1: Wait for identity
        self.state = "AWAITING_IDENTITY"
        await workflow.wait_condition(lambda: self.identity_data is not None)

        # Execute Nafath verification
        nafath_result = await workflow.execute_activity(
            mock_nafath_push, self.identity_data, 
            start_to_close_timeout=timedelta(seconds=30)
        )

        # Step 2: Wait for offer selection
        self.state = "AWAITING_OFFER"
        await workflow.wait_condition(lambda: self.offer_data is not None)
        # ... continues through all 5 steps
```

**File: `workflow/worker.py`** — Connects and listens:
```python
async def main():
    client = await Client.connect("localhost:7233")
    worker = Worker(
        client,
        task_queue="rlos-queue",
        workflows=[RLOSWorkflow],
        activities=[mock_nafath_push, mock_simah_pull, mock_docusign_send, mock_core_banking_transfer]
    )
    await worker.run()
```

**File: `workflow/activities/mock_activities.py`** — Simulated external calls:
```python
@activity.defn
async def mock_nafath_push(data: dict) -> dict:
    await asyncio.sleep(2)  # Simulate API latency
    return {"status": "verified", "nafath_code": "1234"}

@activity.defn
async def mock_simah_pull(data: dict) -> dict:
    await asyncio.sleep(1)  # Simulate credit bureau check
    return {"score": 750, "eligible": True}
```

**How the agent sends signals** (from `agent/extractors/router.py`):
```python
from temporalio.client import Client

client = await Client.connect("localhost:7233")
handle = client.get_workflow_handle(workflow_id)
await handle.signal("identity_received", {"id_number": "1234567890"})
```

### Why use it?

- A loan application can take **minutes to days** (waiting for Nafath verification, customer thinking time)
- If the server crashes, the workflow **resumes from the last completed step**
- Provides **audit trail** — every signal and activity is recorded
- Natural modeling of "wait for human input" (signals)
- Activities retry automatically on failure

---

## 3. SSE Streaming (Server-Sent Events)

### What is it?

SSE is a **one-directional server-to-client streaming protocol** over HTTP. Instead of the client polling "is the response ready yet?", the server keeps the connection open and pushes data as it becomes available — like a live news ticker.

### How does it technically work?

```
Client → HTTP Request (POST /api/chat)
Server → Response with Content-Type: text/event-stream
Server → data: {"chunk 1"}\n\n
Server → data: {"chunk 2"}\n\n
Server → data: {"chunk 3"}\n\n
Server → data: [DONE]\n\n
Connection closed
```

Each "event" is a line starting with `data: ` followed by two newlines. The client receives each event immediately without waiting for the full response.

### The AI SDK v6 UIMessageStream Protocol

This project uses a **specific event format** that the Vercel AI SDK understands:

```
data: {"type": "start", "messageId": "msg_123"}
data: {"type": "start-step"}
data: {"type": "text-start", "id": "part_1"}
data: {"type": "text-delta", "id": "part_1", "delta": "Hello! "}
data: {"type": "text-delta", "id": "part_1", "delta": "Welcome to "}
data: {"type": "text-delta", "id": "part_1", "delta": "FAB Finance."}
data: {"type": "text-end", "id": "part_1"}
data: {"type": "message-metadata", "messageMetadata": {"widget": {...}}}
data: {"type": "finish-step"}
data: {"type": "finish"}
data: [DONE]
```

### How this project uses it

**File: `backend/api/chat.py`**
```python
def _build_sse_stream(response_text: str, widget_spec: dict | None):
    msg_id = f"msg_{uuid4().hex[:8]}"
    text_part_id = f"part_{uuid4().hex[:8]}"

    # Start message
    yield f"data: {json.dumps({'type': 'start', 'messageId': msg_id})}\n\n"
    yield f"data: {json.dumps({'type': 'start-step'})}\n\n"
    yield f"data: {json.dumps({'type': 'text-start', 'id': text_part_id})}\n\n"

    # Stream text in ~20 character chunks (simulates typing)
    for i in range(0, len(response_text), 20):
        chunk = response_text[i:i+20]
        yield f"data: {json.dumps({'type': 'text-delta', 'id': text_part_id, 'delta': chunk})}\n\n"

    yield f"data: {json.dumps({'type': 'text-end', 'id': text_part_id})}\n\n"

    # Attach widget if state changed
    if widget_spec:
        yield f"data: {json.dumps({'type': 'message-metadata', 'messageMetadata': {'widget': widget_spec}})}\n\n"

    yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"
    yield f"data: {json.dumps({'type': 'finish'})}\n\n"
    yield "data: [DONE]\n\n"
```

The backend gets the FULL response from the agent first, then **simulates streaming** by breaking it into 20-character chunks. This creates the "typing" effect in the UI.

### Why use it?

- **User experience**: Text appears word-by-word like someone typing — feels natural
- **AI SDK compatibility**: The `useChat` hook on the frontend expects this exact protocol
- **Widget delivery**: The `message-metadata` event lets the backend send structured widget data alongside text without mixing them
- **Simpler than WebSockets**: One-directional (server → client) is all that's needed here

---

## 4. FastAPI (Python Web Framework)

### What is it?

FastAPI is a **modern, fast Python web framework** for building APIs. It uses Python type hints for automatic request validation, response serialization, and auto-generated docs.

### How does it technically work?

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):      # Pydantic model = auto-validated
    name: str
    price: float

@app.post("/items")         # Decorator = route registration
async def create(item: Item):  # item is auto-parsed from request body
    return {"id": 1, **item.dict()}
```

Key features:
- **Type hints** → automatic validation (wrong types = 422 error)
- **Pydantic models** → request/response schemas with auto-docs
- **Async support** → handles thousands of concurrent connections
- **Auto-docs** → visit `/docs` for Swagger UI
- **Middleware** → plugins that process every request (CORS, auth, logging)

### How this project uses it

**Two separate FastAPI services:**

**Service 1: API Gateway** (Port 8000) — `backend/main.py`
```python
app = FastAPI(title="RLOS API Gateway")

# Allow frontend (localhost:3000) to make requests
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], ...)

# Mount route modules
app.include_router(chat_router, prefix="/api")       # /api/chat
app.include_router(auth_router, prefix="/api/auth")  # /api/auth/login, /api/auth/me
app.include_router(profile_router, prefix="/api/customer")  # /api/customer/profile/{phone}

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Service 2: LangGraph Agent** (Port 8001) — `agent/main.py`
```python
app = FastAPI(title="RLOS LangGraph Agent")

@app.post("/invoke")
async def invoke_agent(req: InvokeRequest):
    result = await graph.ainvoke({"messages": req.messages, "session": req.session})
    return InvokeResponse(response=result["last_response"], session=result["session"])
```

### Why two services?

| Gateway (8000) | Agent (8001) |
|----------------|--------------|
| Auth, cookies, CORS | Pure AI logic |
| Widget resolution | Prompt building |
| SSE streaming | LLM calls |
| Session management | Stateless per request |

This separation means you can scale the agent independently, swap it out, or add rate limiting at the gateway without touching AI code.

### Why FastAPI specifically?

- **Async**: Chat apps need to handle many concurrent connections (users waiting for LLM responses)
- **Fast development**: Type hints = fewer bugs, auto-docs = easy testing
- **Pydantic**: Same models used for API validation AND Temporal workflow inputs
- **Uvicorn**: Production-ready ASGI server with hot reload for development

---

## 5. Next.js App Router (Frontend Routing)

### What is it?

Next.js App Router is a **file-system-based routing system**. Your folder structure IS your URL structure. Special file names (`page.tsx`, `layout.tsx`, `route.ts`) have specific roles.

### How does it technically work?

```
src/app/
├── layout.tsx          → Wraps ALL pages (root layout)
├── page.tsx            → URL: /
├── login/
│   └── page.tsx        → URL: /login
├── (journey)/          → Route Group (no URL impact)
│   ├── layout.tsx      → Wraps all journey pages
│   └── [product]/      → Dynamic segment
│       └── page.tsx    → URL: /cash_finance, /home_loan, etc.
└── api/
    └── chat/
        └── route.ts    → API: POST /api/chat
```

| Concept | Symbol | Example | Explanation |
|---------|--------|---------|-------------|
| Page | `page.tsx` | `login/page.tsx` | Renderable route |
| Layout | `layout.tsx` | `(journey)/layout.tsx` | Shared wrapper that persists on navigation |
| Route Group | `(name)/` | `(journey)/` | Groups files WITHOUT adding to URL |
| Dynamic Route | `[param]/` | `[product]/` | Captures URL segment as variable |
| API Route | `route.ts` | `api/chat/route.ts` | Server-side endpoint (runs on Node.js) |

### How this project uses it

**Root layout** (`src/app/layout.tsx`):
```tsx
// Sets font, html lang, body class — wraps everything
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={openSans.className}>{children}</body>
    </html>
  );
}
```

**Route Group layout** (`src/app/(journey)/layout.tsx`):
```tsx
// Split-panel: chat on left, journey tracker on right
// Only wraps pages inside (journey)/ — NOT the login page
export default function JourneyLayout({ children }) {
  return (
    <div className="flex h-screen">
      <div className="flex-1">{children}</div>      {/* Chat area */}
      <div className="w-80">
        <StepTracker />                              {/* Progress sidebar */}
      </div>
    </div>
  );
}
```

**Dynamic product page** (`src/app/(journey)/[product]/page.tsx`):
```tsx
// URL: /cash_finance → params.product = "cash_finance"
// URL: /home_loan → params.product = "home_loan"
export default function ProductPage({ params }) {
  const { product } = params;  // "cash_finance", "personal_loan", etc.
  // Same component handles ALL products
}
```

**API route** (`src/app/api/chat/route.ts`):
```typescript
// Runs server-side on Node.js — can read cookies, access env vars
export async function POST(request: Request) {
  const cookies = await cookies();
  const session = cookies.get("raya_session");
  // Forward to Python backend with auth
  const response = await fetch("http://localhost:8000/api/chat", { ... });
  return response;  // Stream SSE back to client
}
```

### Why use it?

- **Route Groups `(journey)`**: The login page has NO sidebar, but chat pages DO. Route groups let you apply different layouts without changing URLs
- **Dynamic Routes `[product]`**: One page component handles all loan products — no code duplication
- **API Routes**: Acts as a BFF (Backend for Frontend) — reads HTTP-only cookies the browser can't access via JavaScript, then proxies to Python backend
- **Layouts persist**: The sidebar doesn't re-render when you navigate — smooth UX

---

## 6. AI SDK `useChat` Hook (Chat State Manager)

### What is it?

`useChat` from `@ai-sdk/react` is a **React hook that manages the entire chat lifecycle**: message state, sending messages, parsing SSE streams, handling loading states.

### How does it technically work?

```
User types → sendMessage() → POST to /api/chat with all messages
                                    ↓
                              Server streams SSE back
                                    ↓
useChat parses events → updates messages[] → triggers re-render
                                    ↓
                         UI shows text appearing word-by-word
```

Internally it:
1. Maintains a `messages` array with typed `UIMessage` objects
2. Each message has `parts` (text parts, tool call parts, etc.)
3. On `text-delta` events, it appends to the current text part
4. On `message-metadata`, it attaches extra data to the message
5. Exposes `status`: `"idle"` | `"streaming"` | `"error"`

### How this project uses it

**File: `frontend/src/app/(journey)/[product]/page.tsx`**
```typescript
const { messages, status, sendMessage } = useChat({
  id: sessionId,                    // Scopes state per session
  initialMessages: initialMessages, // Load history from backend
  body: { sessionId },              // Sent in every POST body
  headers: { "x-session-id": sessionId },
});

// Send a message
const handleSend = (text: string) => {
  sendMessage({ message: text, body: { sessionId } });
};

// Render messages
{messages.map(msg => (
  <MessageBubble
    key={msg.id}
    role={msg.role}
    parts={msg.parts}           // Text + widget metadata
    widget={msg.metadata?.widget}
  />
))}

// Show typing indicator
{status === "streaming" && <TypingIndicator />}
```

The response header `x-vercel-ai-ui-message-stream: v1` tells the SDK to use the UIMessageStream parser (the event format described in the SSE section).

### Why use it?

- **Zero manual SSE parsing**: The hook handles the entire `text-delta` → `text-end` protocol
- **Optimistic updates**: User message appears instantly, AI response streams in
- **State management**: No need for Redux/Zustand for chat state
- **History support**: `initialMessages` seeds the chat with server-loaded history
- **Metadata**: Widget data comes through the same stream, attached to messages automatically

---

## 7. State Machine Pattern (Session Flow Control)

### What is it?

A **deterministic model** where the system is always in ONE defined state, and transitions happen ONLY via specific triggers. Like a traffic light: Green → Yellow → Red → Green. You can't go Green → Red directly.

### How does it technically work in this project?

The session has **two levels**:
- `step` — Major phase (identity, offer, trade, esign, disburse)
- `sub_step` — Micro-state within a phase

```
Step: identity
  Sub-steps: awaiting_id → nafath_pending → loading → verified → personal_details

Step: offer
  Sub-steps: eligible → slider → summary

Step: trade
  Sub-steps: loading → success

Step: esign
  Sub-steps: documents → otp_ivr

Step: disburse
  Sub-steps: account → done
```

### How this project uses it

**File: `agent/extractors/router.py`** — The `_advance_session_state()` function:

```python
def _advance_session_state(session: dict, extracted_data: dict) -> dict:
    step = session["step"]
    sub_step = session["sub_step"]

    # IDENTITY step transitions
    if step == "identity":
        if sub_step == "awaiting_id" and extracted_data.get("id_number"):
            session["sub_step"] = "nafath_pending"  # Got ID → show Nafath

        elif sub_step == "nafath_pending" and extracted_data.get("nafath_approved"):
            session["sub_step"] = "loading"  # Nafath approved → loading

        elif sub_step == "loading" and extracted_data.get("verification_complete"):
            session["sub_step"] = "verified"  # Loading done → verified

        elif sub_step == "verified" and extracted_data.get("personal_confirmed"):
            session["sub_step"] = "personal_details"  # Move to personal details

        elif sub_step == "personal_details" and extracted_data.get("details_confirmed"):
            session["step"] = "offer"  # Major step change!
            session["sub_step"] = "eligible"

    # OFFER step transitions
    elif step == "offer":
        if sub_step == "eligible" and extracted_data.get("offer_acknowledged"):
            session["sub_step"] = "slider"

        elif sub_step == "slider" and extracted_data.get("amount_selected"):
            session["sub_step"] = "summary"
        # ... and so on

    return session
```

**File: `agent/graph/nodes.py`** — Deterministic classification (fast-path):
```python
def _deterministic_classify(message: str) -> Optional[str]:
    """Regex-based fast classification — avoids LLM call for obvious inputs"""
    # 10-digit number → definitely an ID
    if re.match(r'^\d{10}$', message.strip()):
        return "identity_input"
    # "yes" / "confirm" / "accept"
    if message.strip().lower() in ["yes", "confirm", "accept", "نعم"]:
        return "confirmation"
    return None  # Ambiguous → fall through to LLM
```

### Why use it?

- **Compliance**: A loan application MUST follow a specific order (can't sign before verification)
- **Predictability**: Every state maps to exactly ONE widget — no ambiguity
- **Security**: Prevents users from skipping KYC steps
- **Debuggability**: At any point you know exactly where the user is in the journey
- **Widget resolution**: Backend just looks at `step/sub_step` → resolves the correct widget

---

## 8. System Prompt Engineering (Dynamic LLM Instructions)

### What is it?

Instead of one static prompt, the system **dynamically builds the LLM's instructions** based on the current session state — different steps get different behavioral rules.

### How does it technically work?

The prompt is assembled from multiple pieces:

```
┌────────────────────────────────┐
│ MASTER PROMPT (~200 lines)     │  ← Persona, tone, language rules
├────────────────────────────────┤
│ SESSION CONTEXT                │  ← Region, step, sub-step, collected data
├────────────────────────────────┤
│ SUB-STEP INSTRUCTIONS          │  ← What to ask and extract RIGHT NOW
└────────────────────────────────┘
```

### How this project uses it

**File: `agent/prompts/builder.py`**
```python
def build_system_prompt(session: dict) -> str:
    region = session.get("region", "SA")
    step = session.get("step", "identity")
    sub_step = session.get("sub_step", "awaiting_id")

    # Get step-specific goal
    step_goal = STEP_GOALS.get((step, sub_step), "Continue the conversation")

    return f"""
{MASTER_SYSTEM_PROMPT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT SESSION CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Region: {region}
Language: {session.get('language', 'ENGLISH')}
Current Step: {step}
Current Sub-Step: {sub_step}
Step Goal: {step_goal}
Data Collected So Far: {json.dumps(session.get('collected', {}))}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUB-STEP INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{get_sub_step_instructions(step, sub_step, region)}
"""
```

**File: `agent/prompts/master_prompt.py`** — Contains rules like:
```
You are Raya, a finance advisor at FAB (First Abu Dhabi Bank).

LANGUAGE RULES:
- If user speaks Arabic → respond in Gulf Arabic dialect
- If user speaks English → respond in British English
- If user speaks Hindi → respond in Hindi with English financial terms

TONE ADAPTATION:
- Match user's formality level
- Use emoji sparingly in text mode, never in voice mode

EXTRACTION FORMAT:
When you identify data, output it in <extract>{"key": "value"}</extract> tags.
This is INVISIBLE to the user — only the system reads it.
```

**File: `agent/prompts/step_goals.py`** — Per-step instructions:
```python
STEP_GOALS = {
    ("identity", "awaiting_id"): "Ask for their national ID / Iqama number",
    ("identity", "nafath_pending"): "Tell them to check the Nafath app on their phone",
    ("offer", "slider"): "Help them adjust loan amount and tenure to fit their budget",
    ("esign", "documents"): "Walk them through the contract documents",
}
```

### Why use it?

- **One model, many behaviors**: GPT-4o-mini acts differently at each step without fine-tuning
- **Compliance per region**: SAMA rules for Saudi, CBUAE rules for UAE — injected dynamically
- **Context awareness**: The LLM knows what data is already collected, so it doesn't re-ask
- **Separation of concerns**: Prompt writers can update instructions without touching code
- **Extraction reliability**: The `<extract>` pattern gives the LLM a structured output format the parser can reliably detect

---

## 9. Docker Compose (Infrastructure)

### What is it?

Docker Compose lets you define and run **multi-container applications** with one YAML file. `docker-compose up` starts everything — databases, message queues, services.

### How does it technically work?

| Concept | Explanation |
|---------|-------------|
| **Service** | One container (e.g., postgres, redis) |
| **Image** | The Docker image to run (from Docker Hub) |
| **Port mapping** | `"5432:5432"` = host port : container port |
| **Volume** | Persistent storage that survives container restart |
| **Network** | Virtual network — containers talk to each other by service name |
| **depends_on** | Start order dependency |

### How this project uses it

**File: `docker-compose.yml`**
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=temporal        # Database for Temporal's internal state
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data   # Data survives restart

  temporal:
    image: temporalio/auto-setup:latest
    environment:
      - DB=postgres12
      - POSTGRES_SEEDS=postgres     # "postgres" = service name = hostname on the network
    ports:
      - "7233:7233"                 # gRPC (workers connect here)
      - "8080:8080"                 # Web UI
    depends_on:
      - postgres                    # Postgres must start first

networks:
  rlos-network:
    driver: bridge                  # All containers can talk to each other

volumes:
  postgres-data:                    # Named volume = persists across docker-compose down/up
  redis-data:
  mongo-data:
```

**How containers communicate:**
- Temporal connects to Postgres using hostname `postgres` (the service name)
- Your Python worker connects to Temporal at `localhost:7233` (port is mapped to host)

### Why use it?

- **One command**: `docker-compose up -d` starts 4 services
- **No local installs**: Don't need PostgreSQL/Redis/Temporal installed on your machine
- **Consistent environment**: Same setup for everyone on the team
- **Isolation**: Services don't conflict with other projects on your machine
- **Data persistence**: Volumes keep data across container restarts

---

## 10. Web Speech API (Browser Voice)

### What is it?

Built-in browser APIs for **Speech-to-Text** (user talks → text) and **Text-to-Speech** (text → computer talks). No API keys, no cloud services — runs locally in the browser.

### How does it technically work?

**STT (Speech Recognition):**
```javascript
const recognition = new SpeechRecognition();
recognition.lang = "en-US";          // Language for recognition
recognition.continuous = false;       // Stop after one phrase
recognition.interimResults = true;    // Show partial results while speaking

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;  // "I want a loan"
};
recognition.start();  // Starts listening via microphone
```

**TTS (Speech Synthesis):**
```javascript
const utterance = new SpeechSynthesisUtterance("Hello! How can I help?");
utterance.lang = "en-US";
utterance.rate = 1.0;    // Speed
utterance.pitch = 1.1;   // Higher = more feminine
speechSynthesis.speak(utterance);  // Computer reads aloud
```

### How this project uses it

**File: `frontend/src/hooks/useVoice.ts`**
```typescript
// State machine: idle → listening → processing → speaking → idle
const [voiceState, setVoiceState] = useState<VoiceState>("idle");

// Start listening
const startListening = () => {
  recognition.lang = language;         // "en-US", "ar-SA", "hi-IN"
  recognition.start();
  setVoiceState("listening");
};

// When speech is recognized
recognition.onresult = (event) => {
  const final = event.results[0][0].transcript;
  if (final.trim()) {
    setVoiceState("processing");
    onTranscript(final.trim());       // Sends text to useChat → backend
  }
};

// Speak the AI response
const speak = (text: string) => {
  const clean = text.replace(/<[^>]*>/g, '');  // Strip HTML/markdown
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = language;
  utterance.pitch = 1.1;              // Slightly higher for female voice
  // Try to find a female voice
  const femaleVoice = voices.find(v => v.name.includes("Female") || v.name.includes("Zira"));
  if (femaleVoice) utterance.voice = femaleVoice;
  speechSynthesis.speak(utterance);
  setVoiceState("speaking");
};
```

### Why use it?

- **Free**: No OpenAI Whisper API costs, no ElevenLabs TTS costs
- **Zero latency**: Runs locally in browser — no network round-trip for voice
- **Multi-language**: Supports Arabic, English, Hindi natively
- **Privacy**: Audio never leaves the user's device
- **Persona**: "Raya" speaks responses aloud in a female voice — creates a conversational banking experience

---

## 11. Cookie-Based Auth (Session Security)

### What is it?

Authentication using **HTTP-only cookies** — tokens stored in the browser that are automatically sent with every request but CANNOT be accessed by JavaScript (prevents XSS attacks stealing tokens).

### How does it technically work?

```
Login Flow:
1. User sends phone + OTP → POST /api/auth/login
2. Server validates → sets cookie: "raya_session=base64(phone:timestamp)"
3. Every subsequent request automatically includes this cookie
4. Server reads cookie → knows who the user is
```

| Cookie Flag | Purpose |
|-------------|---------|
| `httponly=True` | JavaScript can't read it (prevents XSS theft) |
| `samesite="lax"` | Only sent for same-site requests (prevents CSRF) |
| `max_age=86400` | Expires after 24 hours |

### How this project uses it

**File: `backend/api/auth.py`** — Login:
```python
@router.post("/login")
async def login(request: LoginRequest, response: Response):
    # Mock OTP validation (any 4 digits work)
    if len(request.otp) != 4:
        raise HTTPException(401, "Invalid OTP")

    # Create token: base64url("9198765432:1714900000")
    token = base64.urlsafe_b64encode(f"{request.phone}:{time.time()}".encode()).decode()

    # Set HTTP-only cookie
    response.set_cookie(
        key="raya_session",
        value=token,
        httponly=True,      # JS can't access
        samesite="lax",     # CSRF protection
        max_age=86400       # 24 hours
    )
    return {"status": "ok", "phone": request.phone}
```

**File: `backend/api/auth.py`** — Session check:
```python
@router.get("/me")
async def me(request: Request):
    token = request.cookies.get("raya_session")
    if not token:
        raise HTTPException(401, "Not authenticated")
    decoded = base64.urlsafe_b64decode(token).decode()
    phone = decoded.split(":")[0]
    return {"phone": phone}
```

**File: `frontend/src/app/api/chat/route.ts`** — Reading cookie server-side:
```typescript
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("raya_session")?.value;

  // Decode to get phone
  const decoded = Buffer.from(token, "base64url").toString();
  const phone = decoded.split(":")[0];

  // Build session ID: "9198765432_cash_finance"
  const sessionId = `${phone}_${product}`;

  // Forward to backend with session context
  const response = await fetch("http://localhost:8000/api/chat", {
    body: JSON.stringify({ messages, sessionId }),
    headers: { "Content-Type": "application/json", Cookie: `raya_session=${token}` }
  });
  return response;
}
```

### Why use it?

- **Security**: HTTP-only cookies can't be stolen by XSS attacks (unlike localStorage tokens)
- **Automatic**: Browser sends cookies with every request — no manual `Authorization` header
- **Simple**: No JWT library, no token refresh logic — suitable for a demo/PoC
- **BFF pattern**: The Next.js API route (server-side) reads the cookie and adds auth before proxying to Python

---

## 12. Widget System (Rich Chat UI)

### What is it?

A mechanism to render **interactive UI components** (sliders, buttons, verification codes) alongside chat messages. When the conversation reaches certain states, the backend triggers widgets that appear in the chat.

### How does it technically work?

```
Agent advances state → Backend detects state transition → Resolves widget
→ Sends widget spec in SSE metadata → Frontend renders React component
```

### How this project uses it

**Step 1: Backend resolves widget** (`backend/api/chat.py`):
```python
WIDGET_MAP = {
    ("identity", "nafath_pending"):  "NafathWidget",
    ("identity", "loading"):         "LoadingWidget",
    ("identity", "verified"):        "VerificationSuccessWidget",
    ("identity", "personal_details"):"PersonalDetailsWidget",
    ("offer", "eligible"):           "EligibleOfferWidget",
    ("offer", "slider"):             "OfferSliderWidget",
    ("offer", "summary"):            "FinanceSummaryWidget",
    ("esign", "documents"):          "DocumentPreviewWidget",
    ("esign", "otp_ivr"):            "OtpVerificationWidget",
    ("disburse", "account"):         "AccountSelectorWidget",
    ("disburse", "done"):            "DisbursementWidget",
}

def resolve_widget(session, prev_state_key):
    current_key = f"{session['step']}/{session['sub_step']}"
    if current_key != prev_state_key:  # Only on TRANSITION
        widget_name = WIDGET_MAP.get((session['step'], session['sub_step']))
        if widget_name:
            return {"widget": widget_name, "data": get_widget_data(session)}
    return None  # No widget if state didn't change
```

**Step 2: Sent via SSE metadata:**
```python
yield f'data: {json.dumps({"type": "message-metadata", "messageMetadata": {"widget": widget_spec}})}\n\n'
```

**Step 3: Frontend renders widget** (inside `MessageBubble`):
```tsx
// Widget picker based on type
const WidgetComponent = {
  NafathWidget: NafathWidget,
  OfferSliderWidget: OfferSliderWidget,
  OtpVerificationWidget: OtpVerificationWidget,
  // ...
}[widget.widget];

return <WidgetComponent data={widget.data} onAction={handleWidgetAction} />;
```

**Step 4: Widget sends user action back to chat:**
```tsx
// Inside NafathWidget — when user clicks "Open Nafath App"
const handleClick = () => {
  // Dispatches a custom event that the chat page listens to
  window.dispatchEvent(new CustomEvent('mock-send-message', {
    detail: 'I have approved the Nafath request'
  }));
};
```

### Why use it?

- **Rich interactions**: You can't do loan amount sliders or document previews in plain text
- **Conversational flow**: Widgets appear inline with chat messages — feels natural
- **State-driven**: Widget appearance is deterministic (same state = same widget)
- **Bidirectional**: Widgets can send messages back into the chat (e.g., "Nafath approved")
- **Only on transitions**: Prevents duplicate widgets when user sends multiple messages in same state

---

## 13. OpenAI API (LLM Calls)

### What is it?

OpenAI's Chat Completions API — you send a conversation (system message + user/assistant messages) and get back an AI-generated response.

### How does it technically work?

```python
response = await client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"},
        {"role": "assistant", "content": "Hi there! How can I help?"},
        {"role": "user", "content": "I need a loan"},
    ],
    temperature=0.7,  # 0=deterministic, 1=creative
)
text = response.choices[0].message.content
```

| Parameter | Purpose |
|-----------|---------|
| `model` | Which AI model (gpt-4o-mini = fast + cheap) |
| `messages` | Full conversation history (system + user + assistant turns) |
| `temperature` | Randomness: 0 = same answer every time, 0.7 = natural variation |

### How this project uses it

**File: `agent/graph/nodes.py`**
```python
from openai import AsyncOpenAI

_client = AsyncOpenAI()  # Reads OPENAI_API_KEY from environment

async def _chat(model: str, messages: list[dict], temperature: float = 0.7) -> str:
    resp = await _client.chat.completions.create(
        model=model, messages=messages, temperature=temperature
    )
    return resp.choices[0].message.content or ""
```

**Two different LLM calls per user message:**

**Call 1 — Classification** (when regex fails):
```python
# Low temperature = deterministic classification
classification = await _chat("gpt-4o-mini", [
    {"role": "system", "content": "Classify this user message into one of: identity_input, confirmation, question, greeting, ..."},
    {"role": "user", "content": user_message}
], temperature=0.0)
```

**Call 2 — Response generation:**
```python
# Higher temperature = natural, varied responses
system_prompt = build_system_prompt(session)  # Dynamic per state
oai_messages = [{"role": "system", "content": system_prompt}]
for m in conversation_history:
    oai_messages.append({"role": m["role"], "content": m["content"]})

response_text = await _chat("gpt-4o-mini", oai_messages, temperature=0.7)
```

### Why these choices?

- **gpt-4o-mini**: Fast (~500ms) and cheap ($0.15/1M input tokens) — good for a chatbot making 2 calls per turn
- **AsyncOpenAI**: Non-blocking — the server can handle other requests while waiting for OpenAI
- **Temperature 0 for classification**: You want the same input to always get the same classification
- **Temperature 0.7 for response**: Natural language should have some variation — "Hello!" shouldn't always get the exact same reply
- **Full history in messages**: The LLM sees the entire conversation so it can reference earlier context

---

## 14. File-Based Persistence (Dev Storage)

### What is it?

Storing session state and conversation history as **JSON files on disk** — a simple developer-friendly alternative to Redis + MongoDB for local development.

### How does it technically work?

```
.data/
├── sessions/
│   ├── 9198765432_cash_finance.json    ← Session state (step, sub_step, collected data)
│   └── 9198765432_personal_loan.json
└── conversations/
    ├── 9198765432_cash_finance.json    ← Full message history
    └── 9198765432_personal_loan.json
```

### How this project uses it

**File: `agent/persistence.py`**
```python
STORE_DIR = Path(__file__).parent.parent / ".data"
SESSION_DIR = STORE_DIR / "sessions"
CHAT_DIR = STORE_DIR / "conversations"
SESSION_TTL = 1800  # 30 minutes

# Path sanitization (security)
def _safe_path(base: Path, session_id: str) -> Path:
    safe_id = session_id.replace("/", "_").replace("\\", "_").replace("..", "_")
    return base / f"{safe_id}.json"

# Get session (with TTL expiry — like Redis)
def get_session(session_id: str) -> dict | None:
    path = _safe_path(SESSION_DIR, session_id)
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    # Check if expired (mimics Redis TTL)
    if time.time() - data["_saved_at"] > SESSION_TTL:
        path.unlink()  # Delete expired session
        return None
    return {k: v for k, v in data.items() if not k.startswith("_")}

# Save session
def save_session(session_id: str, session: dict) -> None:
    path = _safe_path(SESSION_DIR, session_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {**session, "_saved_at": time.time()}
    path.write_text(json.dumps(data, indent=2))

# Append messages (like MongoDB push)
def append_messages(session_id: str, messages: list[dict]) -> None:
    path = _safe_path(CHAT_DIR, session_id)
    existing = json.loads(path.read_text()) if path.exists() else {"messages": []}
    existing["messages"].extend([{**m, "timestamp": time.time()} for m in messages])
    existing["updated_at"] = time.time()
    path.write_text(json.dumps(existing, indent=2))
```

**Security: Path traversal prevention:**
```python
# If someone sends session_id = "../../etc/passwd" 
# It becomes "______etc_passwd" → safe
safe_id = session_id.replace("/", "_").replace("\\", "_").replace("..", "_")
```

### Why use it?

- **Zero infrastructure**: Works without Redis/MongoDB running
- **Inspectable**: Open the JSON file in VS Code to see session state
- **Mirrors production schema**: Same data shape as Redis (with TTL) and MongoDB (document with messages array)
- **Easy migration**: When moving to production, swap `get_session()` implementation to Redis client — no other code changes needed
- **Graceful degradation**: If Docker isn't running, the app still works

---

## Summary: How It All Fits Together

```
User speaks/types → Frontend (useChat) → Next.js API route (reads cookie)
    → Backend gateway (FastAPI 8000) → Agent (FastAPI 8001)
        → LangGraph: classify → extract (→ Temporal signal) → respond (→ OpenAI)
    ← Backend adds widget ← SSE stream
← Frontend renders text + widget ← Browser speaks response (TTS)
```

| Layer | Tech | Why |
|-------|------|-----|
| UI | Next.js + React + AI SDK | Modern streaming chat with widgets |
| Voice | Web Speech API | Free, local, multi-language |
| API Gateway | FastAPI | Auth, SSE streaming, widget resolution |
| AI Brain | LangGraph + GPT-4o-mini | Structured AI pipeline |
| Orchestration | Temporal | Durable long-running loan workflow |
| State | File-based JSON (dev) / Redis+Mongo (prod) | Session + history persistence |
| Infrastructure | Docker Compose | One-command setup |
