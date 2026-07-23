# AiAgentChat Project Interview Q&A

This document contains basic interview-style questions and answers for this project. The answers are written from the perspective of explaining the current implementation in a simple, practical way.

## 1. What is this project?

This project is an AI-assisted finance journey platform. It combines a Next.js frontend, a FastAPI backend gateway, a separate AI agent service, and a Temporal workflow worker to guide a customer through a digital cash-finance journey.

## 2. Why did we split the project into frontend, backend, agent, and workflow services?

We split the project by responsibility.

- The frontend handles the customer UI.
- The backend acts as the API gateway and business-control layer.
- The agent handles LLM-driven classification, extraction, and response generation.
- The workflow service handles long-running journey orchestration.

This separation makes the system easier to maintain, test, and scale independently.

## 3. Why did we use Next.js for the frontend?

We used Next.js because it gives us a strong React-based application structure, built-in routing, API routes, and good support for modern interactive UI patterns. In this project, it is especially useful because the frontend also provides a server-side proxy route for chat requests.

## 4. Why does the frontend have its own chat API route instead of calling the backend directly from the browser?

The frontend proxy helps centralize session handling and keeps browser-side code simpler. It also lets the app derive the session from cookies and headers before forwarding requests to the backend. This reduces duplication in the client and gives us a clean integration point for streaming responses.

## 5. Why did we use FastAPI in the backend and agent services?

We used FastAPI because it is lightweight, fast, and fits well for JSON APIs, async request handling, and service-to-service communication. It works well for both the API gateway and the agent service, where most interactions are HTTP-based and response speed matters.

## 6. What is the role of the backend in this architecture?

The backend is the control layer between the UI and the AI agent. It handles chat routing, session state management, widget resolution, external integrations such as OTP or email flows, and response streaming. In short, the backend protects the domain flow from being fully controlled by the LLM.

## 7. Why is the AI agent a separate service instead of part of the backend?

The AI agent is separated so LLM logic stays isolated from API-gateway responsibilities. This keeps prompt-building, classification, extraction, and response generation in one focused service. It also makes it easier to swap models, tune prompts, or scale AI workloads without tightly coupling them to the business API.

## 8. What does LangGraph give us in this project?

LangGraph gives us a simple pipeline for conversational state processing. In this project, the graph runs three main stages: classify intent, extract structured data, and build the response. That makes the agent flow explicit and easier to reason about than one large prompt doing everything.

## 9. Why do we use deterministic rules before calling the LLM?

We do that for speed, cost, and reliability. Many journey actions are predictable, such as continue, decline, widget-driven transitions, and specific structured inputs. If we can classify those deterministically, we avoid unnecessary LLM calls and reduce ambiguity.

## 10. How do we handle general questions that should not change the journey state?

The project has a dedicated question-answering path. Instead of routing those messages through the full journey pipeline, the system answers them using FAQ retrieval plus LLM generation without mutating the session. That prevents accidental step changes when the customer is only asking for clarification.

## 11. Why do we keep both an API gateway session and an agent session?

Because the gateway is treated as the live source of truth for widget state and journey state coming from the UI. The agent can still use cached or persisted data, but incoming gateway state is allowed to override stale state. This helps avoid drift between UI behavior and LLM memory.

## 12. How is session data handled in the project?

Session data is stored per conversation using a session ID. The project supports MongoDB-backed persistence, but it also falls back to JSON-file storage for portability and demo use. This lets the project run locally without requiring the full production persistence stack.

## 13. Why do we use MongoDB or JSON files for journey sessions and chat history?

Journey sessions and conversations are semi-structured and change frequently, so a document-style store is a practical fit. JSON fallback is used because it is simple for local development and demos. MongoDB is the more production-ready option because it provides persistent document storage with easier querying and indexing.

## 14. Why is SQL Server also present in the project?

SQL Server is used for customer master-style data and structured records. That type of data is relational and usually comes from enterprise banking systems, so a relational database is a better fit than a document store for those records.

## 15. Why did we not put everything in one database?

Because different data types have different access patterns.

- Customer and profile data are structured and relational.
- Journey state and conversation history are document-oriented and evolve quickly.

Using the right persistence style for each kind of data keeps the design cleaner and closer to real enterprise architecture.

## 16. How do we handle long-running business steps in the finance journey?

We use Temporal. The workflow service models the overall loan journey as a long-running process with signals and activities. This is better than keeping that logic inside a normal API request because identity verification, bureau checks, e-sign, and disbursement are all multi-step operations that may pause and resume.

## 17. Why is Temporal useful here instead of coding the whole flow inside the backend?

Temporal is useful because it gives durable workflow state, signal-driven progression, and clearer orchestration for long-running tasks. If we kept the whole journey inside normal request handlers, the logic would become harder to manage and less resilient for real-world process orchestration.

## 18. How does the agent interact with the workflow layer?

The agent extracts structured intent and data from user messages, then routes that information to the workflow layer through a router that triggers Temporal signals. This means the LLM helps understand the user, but the actual business progression is controlled by workflow state.

## 19. How do we stop the LLM from controlling everything?

We limit the LLM's job to understanding and answering, not owning the whole business process. Deterministic logic, session state, routing signals, workflow orchestration, and gateway-level controls are used to keep the final system behavior predictable.

## 20. Why does the chat layer support SSE streaming?

Server-Sent Events improve the chat experience because responses can be streamed back progressively instead of waiting for a full payload. That makes the UI feel more responsive, especially for AI-generated answers.

## 21. How does the frontend handle delayed message and widget rendering?

The frontend reveals assistant messages and widgets with controlled timing. This improves the conversational feel and prevents UI components from appearing too abruptly. It also helps coordinate widget visibility with streamed or staged assistant output.

## 22. Why do we have internal routing signals such as system-prefixed messages?

Those signals let widgets and UI actions move the journey forward without polluting the LLM conversation history. That is important because internal control events should drive workflow transitions but should not be treated like normal user language by the model.

## 23. How do we handle fallback behavior when some infrastructure is unavailable?

The project is designed with practical fallbacks.

- MongoDB can fall back to JSON-file persistence.
- Customer data can fall back to seeded local data when MSSQL is unavailable.
- Some workflow integrations are mocked for demo flows.

This makes local development easier while preserving the shape of a production system.

## 24. Why do we have FAQ retrieval in addition to normal LLM answers?

FAQ retrieval gives the system a cheaper and more controlled way to answer common journey questions. It improves consistency, reduces hallucination risk, and keeps answers aligned with domain-specific language such as finance amount, tenure, and bank account context.

## 25. How is eligibility handled in the project?

Eligibility uses business logic instead of pure LLM reasoning. The project has a calculation utility based on FOIR and obligation rules to compute maximum eligible amount. This is important because financial eligibility should be rule-driven and auditable, not generated loosely by the model.

## 26. Why are some external actions mocked?

Actions like Nafath, SIMAH, DocuSign, and core banking transfer are mocked so the end-to-end journey can be demonstrated without relying on live external systems. This keeps development and testing faster while preserving realistic workflow boundaries.

## 27. Why do we use Docker Compose for this project?

Docker Compose makes it easy to run the full stack locally: frontend, backend, agent, workflow worker, PostgreSQL, Redis, MongoDB, SQL Server, and Temporal. That is useful because this project depends on multiple services and local setup would be harder without orchestration.

## 28. Why are Redis and PostgreSQL present if the main app logic focuses on MongoDB and MSSQL?

They are part of the wider platform setup. PostgreSQL supports Temporal in the compose environment, and Redis is available for session-style caching or future infrastructure needs. Even if some components are not fully used in every local run, they reflect the intended full-system architecture.

## 29. How do we balance demo convenience with production architecture?

The project keeps production-style boundaries but allows development shortcuts. For example, it preserves service separation, workflow orchestration, and database layering, while also supporting JSON persistence, mocked integrations, and seeded data for local execution.

## 30. What would you say is the main design principle of this project?

The main design principle is controlled AI orchestration. The LLM improves the conversation and extracts intent, but deterministic state management, backend controls, workflow orchestration, and business rules are used to keep the finance journey safe and predictable.

## 31. If an interviewer asks, "Why not make this a single monolith?"

The answer is that a monolith would be simpler at the start, but this project has clearly different concerns: UI, gateway logic, AI orchestration, workflow state, and data persistence. Splitting them now makes the design closer to how enterprise conversational banking systems are usually structured.

## 32. If an interviewer asks, "What is one area you would improve next?"

A strong answer would be: I would strengthen observability and production hardening. For example, I would add deeper tracing across frontend, gateway, agent, and workflow boundaries, formalize persistence strategies, and replace demo fallbacks with production-grade adapters where needed.

## Short version for quick interview answers

If you need fast one-line answers in an interview, you can use these:

- We used Next.js for the UI and frontend proxying.
- We used FastAPI because it is lightweight and strong for async APIs.
- We separated the AI agent so LLM logic stays isolated and scalable.
- We used LangGraph to keep the conversational pipeline explicit.
- We used deterministic rules first to reduce cost and improve reliability.
- We used Temporal for long-running, signal-driven finance workflow orchestration.
- We used MongoDB or JSON for flexible journey/session storage.
- We used SQL Server for structured enterprise customer data.
- We used SSE to make chat responses feel real-time.
- We kept business rules like eligibility outside the LLM for safety and auditability.