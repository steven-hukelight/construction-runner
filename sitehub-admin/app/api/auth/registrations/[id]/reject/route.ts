import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = (await cookies()).get("role")?.value;
    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const roleLower = role.toLowerCase();
    if (roleLower !== "superuser" && roleLower !== "admin" && roleLower !== "supervisor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { data } = await supabaseAdmin.from("registrations").select("id, data").eq("id", id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const merged = { ...((data.data as Record<string, unknown>) ?? {}), status: "REJECTED", rejectedAt: new Date().toISOString() };
    await supabaseAdmin.from("registrations").update({ data: merged }).eq("id", id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
