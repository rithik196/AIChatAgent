"""
Persistence layer for sessions and conversations.

System design prescribes:
  - Redis for session state (key: session:{id}, TTL 30 min)
  - MongoDB for conversation history (messages array)

This implementation uses JSON files for demo portability.
Swap to redis-py / pymongo for production.
"""

import json
import os
import time
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Storage directory
STORE_DIR = Path(__file__).parent.parent / ".data"
SESSION_DIR = STORE_DIR / "sessions"
CHAT_DIR = STORE_DIR / "conversations"

# Ensure dirs exist
SESSION_DIR.mkdir(parents=True, exist_ok=True)
CHAT_DIR.mkdir(parents=True, exist_ok=True)

SESSION_TTL = 1800  # 30 minutes


# ── Session Store (mirrors Redis schema) ─────────────────────────────

def _session_path(session_id: str) -> Path:
    # Sanitize session_id for filesystem
    safe_id = session_id.replace("/", "_").replace("\\", "_").replace("..", "_")
    return SESSION_DIR / f"{safe_id}.json"


def get_session(session_id: str) -> dict | None:
    """Load session from store. Returns None if expired or missing."""
    path = _session_path(session_id)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        # Check TTL
        saved_at = data.get("_saved_at", 0)
        if time.time() - saved_at > SESSION_TTL:
            logger.info(f"Session expired: {session_id}")
            path.unlink(missing_ok=True)
            return None
        # Remove internal fields before returning
        session = {k: v for k, v in data.items() if not k.startswith("_")}
        return session
    except (json.JSONDecodeError, OSError) as e:
        logger.error(f"Failed to load session {session_id}: {e}")
        return None


def save_session(session_id: str, session: dict) -> None:
    """Save session to store with timestamp."""
    path = _session_path(session_id)
    data = {**session, "_saved_at": time.time()}
    try:
        path.write_text(json.dumps(data, ensure_ascii=False, default=str), encoding="utf-8")
    except OSError as e:
        logger.error(f"Failed to save session {session_id}: {e}")


# ── Conversation Store (mirrors MongoDB conversations collection) ────

def _chat_path(session_id: str) -> Path:
    safe_id = session_id.replace("/", "_").replace("\\", "_").replace("..", "_")
    return CHAT_DIR / f"{safe_id}.json"


def get_conversation(session_id: str) -> list[dict]:
    """Load conversation messages. Returns empty list if none."""
    path = _chat_path(session_id)
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("messages", [])
    except (json.JSONDecodeError, OSError):
        return []


def append_messages(session_id: str, messages: list[dict]) -> None:
    """Append messages to conversation history."""
    path = _chat_path(session_id)
    existing = []
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            existing = data.get("messages", [])
        except (json.JSONDecodeError, OSError):
            existing = []

    # Deduplicate by checking last message content
    for msg in messages:
        # Simple dedup: don't add if last message is identical
        if existing and existing[-1].get("role") == msg.get("role") and existing[-1].get("content") == msg.get("content"):
            continue
        existing.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
            "timestamp": msg.get("timestamp", time.time()),
        })

    doc = {
        "session_id": session_id,
        "messages": existing,
        "updated_at": time.time(),
    }
    try:
        path.write_text(json.dumps(doc, ensure_ascii=False, default=str), encoding="utf-8")
    except OSError as e:
        logger.error(f"Failed to save conversation {session_id}: {e}")


def save_full_conversation(session_id: str, messages: list[dict]) -> None:
    """Overwrite entire conversation (used by route.ts proxy)."""
    path = _chat_path(session_id)
    doc = {
        "session_id": session_id,
        "messages": messages,
        "updated_at": time.time(),
    }
    try:
        path.write_text(json.dumps(doc, ensure_ascii=False, default=str), encoding="utf-8")
    except OSError as e:
        logger.error(f"Failed to save conversation {session_id}: {e}")
