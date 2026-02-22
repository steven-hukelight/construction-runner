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
      .from("messages")
      .select("id, sender_id, sender_name, content, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(100);

    const items = (data ?? []).map((m) => ({
      id: m.id,
      sender: (m as Record<string, unknown>).sender_name ?? "Unknown",
      content: (m as Record<string, unknown>).content ?? "",
      timestamp: (m as Record<string, unknown>).created_at ?? null,
    }));
    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/companies/[companyId]/messages failed:", e);
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

    const cookieStore = await cookies();
    const userEmail = cookieStore.get("user_email")?.value?.trim();
    const role = cookieStore.get("role")?.value;
    let senderId: string | null = null;
    let senderName = "Anonymous";

    if (userEmail) {
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("id, display_name")
        .eq("email", userEmail)
        .limit(1)
        .maybeSingle();
      if (user) {
        senderId = (user as { id: string }).id;
        senderName = ((user as { display_name?: string }).display_name || userEmail.split("@")[0] || "User").trim();
      }
    }

    const body = await req.json();
    const content = String(body?.content ?? "").trim();
    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert({ company_id: companyId, sender_id: senderId, sender_name: senderName, content })
      .select("id")
      .single();

    if (error) {
      console.error("POST messages failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/companies/[companyId]/messages failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
