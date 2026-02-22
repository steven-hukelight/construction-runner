import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = (await cookies()).get("role")?.value;
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roleLower = role.toLowerCase();
  if (roleLower !== "superuser" && roleLower !== "admin" && roleLower !== "supervisor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: regId } = await params;

  const { data: reg } = await supabaseAdmin.from("registrations").select("id, data").eq("id", regId).maybeSingle();
  if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  const merged = { ...((reg.data as Record<string, unknown>) ?? {}), status: "REJECTED", rejected_at: new Date().toISOString() };
  await supabaseAdmin.from("registrations").update({ data: merged }).eq("id", regId);
  return NextResponse.json({ success: true });
}
