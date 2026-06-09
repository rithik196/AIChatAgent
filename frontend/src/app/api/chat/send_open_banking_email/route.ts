import { NextResponse } from "next/server";

const BACKEND_URL = "http://localhost:8000";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await fetch(`${BACKEND_URL}/send_open_banking_email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Failed to connect to backend send_open_banking_email:", error);
    return NextResponse.json({ error: "Failed to connect to backend." }, { status: 500 });
  }
}
