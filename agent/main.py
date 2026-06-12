import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from graph.graph import agent_app
from persistence import get_session, save_session, append_messages, get_conversation

app = FastAPI(title="RLOS LangGraph Agent")

# In-memory cache backed by file persistence
SESSION_CACHE: dict[str, dict] = {}

class InvokeRequest(BaseModel):
    session_id: str = "default_session"
    messages: List[Dict[str, Any]]
    session: Dict[str, Any]

class InvokeResponse(BaseModel):
    response: str
    session: Dict[str, Any]
    extract: Optional[Dict[str, Any]] = None

class ConversationResponse(BaseModel):
    messages: List[Dict[str, Any]]
    session: Optional[Dict[str, Any]] = None

@app.get("/conversation/{session_id}", response_model=ConversationResponse)
async def get_conversation_history(session_id: str):
    """Return saved conversation + session for a given session ID."""
    messages = get_conversation(session_id)
    session = get_session(session_id)
    return ConversationResponse(messages=messages, session=session)

@app.post("/invoke", response_model=InvokeResponse)
async def invoke_agent(req: InvokeRequest):
    try:
        # 1. Try in-memory cache first, then file store, then create new
        if req.session_id in SESSION_CACHE:
            current_session = SESSION_CACHE[req.session_id]
        else:
            persisted = get_session(req.session_id)
            if persisted:
                current_session = persisted
            else:
                current_session = {
                    "region": "SA",
                    "step": "identity",
                    "sub_step": "awaiting_id",
                    "step_number": 1,
                    "total_steps": 5,
                    "product": "cash_finance",
                    "user_type": "unknown",
                    "customerType": "UNKNOWN",
                    "journeyMode": "PRE_DEDUPE",
                    "journeyOrigin": "UNKNOWN",
                    "transitionReason": None,
                    "collected": {},
                    "offer": {},
                    "finance_summary": {},
                    "disbursement": {},
                    "failed_attempts": 0,
                }
                # Merge incoming session over defaults
                current_session.update(req.session)

        # Cache it
        SESSION_CACHE[req.session_id] = current_session

        state = {
            "messages": req.messages,
            "session": current_session,
            "last_response": "",
            "extract": None
        }
        
        result = await agent_app.ainvoke(state)
        
        # Save updated session to cache + file
        SESSION_CACHE[req.session_id] = result["session"]
        save_session(req.session_id, result["session"])

        # Internal routing signals — never stored in history so LLM cannot read them
        _ROUTING_SIGNALS = {
            "nafath approved", "loading_complete", "loading complete",
            "continue", "dedupe_complete", "dedupe complete",
            "identity_complete", "verification_loading", "done",
            "accepted_max_offer", "higher_amount_requested",
        }

        # Save conversation: user message + assistant response
        # Skip internal routing signals so they never pollute the LLM context
        last_user = req.messages[-1] if req.messages else None
        new_msgs = []
        if last_user and last_user.get("role") == "user":
            content = last_user.get("content", "")
            if content.lower().strip() not in _ROUTING_SIGNALS:
                new_msgs.append({"role": "user", "content": content})
        assistant_content = (result.get("last_response") or "").strip()
        if assistant_content:
            new_msgs.append({"role": "assistant", "content": assistant_content})
        append_messages(req.session_id, new_msgs)
        
        return InvokeResponse(
            response=result["last_response"],
            session=result["session"],
            extract=result.get("extract")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
