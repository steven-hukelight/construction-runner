import { randomUUID } from "node:crypto";
import { normalizeCoshhRow } from "@/lib/coshhRow";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId) {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role: cookieStore.get("role")?.value,
        })) || undefined;
    }
    if (role !== "superuser" && !companyId) return NextResponse.json([]);

    let query = supabaseAdmin.from("coshh").select("*").order("created_at", { ascending: false });
    if (companyId) query = query.eq("company_id", companyId);
    const { data, error } = await query;
    if (error) {
      console.error("GET /api/coshh:", error.message);
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json(
      (data ?? []).map((d) => normalizeCoshhRow(d as Record<string, unknown>))
    );
  } catch (e) {
    console.error("GET /api/coshh:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const cookieStore = await cookies();
  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId) {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role: cookieStore.get("role")?.value,
      })) || undefined;
  }
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const title = (body.title as string) || "Untitled";
  const substance = typeof body.substance === "string" ? body.substance : "";
  const hazardSymbols = Array.isArray(body.hazardSymbols)
    ? (body.hazardSymbols as unknown[]).map((x) => String(x))
    : [];
  const ppe = typeof body.ppe === "string" ? body.ppe : "";
  const fileUrl = body.fileUrl != null ? String(body.fileUrl) : null;

  const id = randomUUID();

  const fullRow: Record<string, unknown> = {
    id,
    title,
    substance,
    hazard_symbols: hazardSymbols,
    ppe,
    file_url: fileUrl || null,
    company_id: companyId,
  };

  let { data, error } = await supabaseAdmin.from("coshh").insert(fullRow).select("id").single();

  if (error) {
    console.warn("POST /api/coshh full row failed, using body JSON fallback:", error.message);
    const bodyJson = JSON.stringify({
      substance,
      hazardSymbols,
      ppe,
    });
    const fallback = {
      id,
      title,
      company_id: companyId,
      body: bodyJson,
    };
    const retry = await supabaseAdmin.from("coshh").insert(fallback).select("id").single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("POST /api/coshh failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id });
}
