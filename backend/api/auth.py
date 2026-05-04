"""
Auth API — login (mock OTP) and session check.
Uses simple base64url token in cookie for demo.
Production: replace with JWT + Redis session per system design.
"""

from fastapi import APIRouter, Response, Request
from pydantic import BaseModel
import base64
import time

router = APIRouter()

# In-memory user store (demo — replace with DB for production)
USER_STORE: dict[str, dict] = {}


class LoginRequest(BaseModel):
    phone: str


@router.post("/login")
async def login(req: LoginRequest, response: Response):
    phone = req.phone
    if not phone or not isinstance(phone, str):
        return {"error": "Phone number required"}

    # Clean phone number
    cleaned = phone.strip().replace(" ", "").removeprefix("+966")

    # Create session token
    token = base64.urlsafe_b64encode(f"{cleaned}:{int(time.time())}".encode()).decode()
    USER_STORE[token] = {"phone": cleaned, "loggedInAt": time.time()}

    # Set HTTP-only cookie
    response.set_cookie(
        key="raya_session",
        value=token,
        httponly=True,
        samesite="lax",
        path="/",
        max_age=86400,  # 24 hours
    )

    return {"authenticated": True, "phone": cleaned}


@router.get("/me")
async def me(request: Request):
    token = request.cookies.get("raya_session")
    if not token:
        return {"authenticated": False}
    try:
        decoded = base64.urlsafe_b64decode(token).decode()
        phone = decoded.split(":")[0]
        if not phone:
            return {"authenticated": False}
        return {"authenticated": True, "phone": phone}
    except Exception:
        return {"authenticated": False}
