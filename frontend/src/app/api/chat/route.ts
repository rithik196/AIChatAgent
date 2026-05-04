import { cookies } from "next/headers";

const BACKEND_URL = "http://localhost:8000";

export async function POST(req: Request) {
  const body = await req.json();
  const { messages } = body;

  // Derive session ID from auth cookie (phone-based) + chatId
  const cookieStore = await cookies();
  const token = cookieStore.get("raya_session")?.value;
  let phone = "anonymous";
  if (token) {
    try {
      const decoded = Buffer.from(token, "base64url").toString();
      phone = decoded.split(":")[0] || "anonymous";
    } catch { /* use anonymous */ }
  }
  // Get sessionId from header (most reliable), body, or derive from Referer
  let sessionId = req.headers.get("x-session-id") || body.sessionId;
  if (!sessionId) {
    const referer = req.headers.get("referer") || "";
    const urlMatch = referer.match(/\/([a-z_]+)\/?$/);
    const product = urlMatch ? urlMatch[1] : "default";
    sessionId = `${phone}_${product}`;
  }

  // Format messages for backend
  const formattedMessages = messages.map((m: any) => ({
    role: m.role,
    content: m.content || (m.parts ? m.parts.map((p: any) => p.text).filter(Boolean).join('') : '')
  }));

  try {
    // Proxy to backend API gateway
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response("Backend error: " + err, { status: 500 });
    }

    // Stream SSE response through to client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "x-vercel-ai-ui-message-stream": "v1",
      },
    });
  } catch (error: any) {
    console.error("Failed to connect to backend:", error);
    return new Response("Failed to connect to backend.", { status: 500 });
  }
}
