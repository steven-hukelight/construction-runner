import { NextResponse } from "next/server";

const SUPABASE_EDGE_URL = process.env.SUPABASE_EDGE_URL || "https://YOUR_PROJECT.functions.supabase.co/send-direct-notification";

type Body = {
  userId: string;
  token?: string;
  topic?: string;
  title: string;
  message: string;
  data?: Record<string, string>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { userId, title, message, data } = body;
    if (!userId || !title || !message) {
      return NextResponse.json({ error: "userId, title and message required" }, { status: 400 });
    }
    // Call Supabase Edge Function to send notification to all user devices
    const res = await fetch(SUPABASE_EDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, message, data }),
    });
    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json.error || "Failed to send notification" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("POST /api/notifications/send failed:", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
