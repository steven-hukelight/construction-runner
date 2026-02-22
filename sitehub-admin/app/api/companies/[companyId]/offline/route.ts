import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

async function ensureAccess(companyId: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const userEmail = cookieStore.get("user_email")?.value;
  let effectiveCompanyId = cookieStore.get("companyId")?.value?.trim();

  if (!effectiveCompanyId && role !== "superuser") {
    effectiveCompanyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail,
        role,
      })) || undefined;
  }

  const roleLower = (role ?? "").toLowerCase();
  if (roleLower === "operative") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role !== "superuser" && effectiveCompanyId !== companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const err = await ensureAccess(companyId);
    if (err) return err;

    const { data } = await supabaseAdmin
      .from("offline_sync_log")
      .select("id, content, synced_at")
      .eq("company_id", companyId)
      .order("synced_at", { ascending: false })
      .limit(100);

    const items = (data ?? []).map((o) => ({
      id: (o as Record<string, unknown>).id,
      content: (o as Record<string, unknown>).content ?? "",
      synced_at: (o as Record<string, unknown>).synced_at ?? null,
    }));
    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/companies/[companyId]/offline failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const err = await ensureAccess(companyId);
    if (err) return err;

    const body = await req.json();
    const content = String(body?.content ?? "").trim();
    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("offline_sync_log")
      .insert({ company_id: companyId, content })
      .select("id")
      .single();

    if (error) {
      console.error("POST offline_sync_log failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/companies/[companyId]/offline failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
