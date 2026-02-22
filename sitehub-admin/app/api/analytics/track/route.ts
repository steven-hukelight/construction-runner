import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value?.toLowerCase();
    if (role !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const event = String(body?.event ?? "").trim();
    const properties = (body?.properties as Record<string, unknown>) ?? {};

    if (!event) return NextResponse.json({ error: "event required" }, { status: 400 });

    try {
      await supabaseAdmin.from("system_logs").insert({
        level: "info",
        message: `analytics: ${event}`,
        source: "analytics",
        metadata: { event, ...properties },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
