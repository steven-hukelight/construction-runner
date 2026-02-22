import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

async function ensureAccess(req: Request, threadId: string): Promise<{ companyId: string; userId: string; role: string; error: NextResponse | null }> {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value?.trim();
  const userEmail = cookieStore.get("user_email")?.value?.trim();
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
  let companyId = cookieStore.get("companyId")?.value?.trim();

  if (!uid && !userEmail) {
    return { companyId: "", userId: "", role: "", error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  let userId = uid ?? null;
  if (!userId && userEmail) {
    const { data } = await supabaseAdmin.from("users").select("id, company_id").eq("email", userEmail).maybeSingle();
    if (data) {
      userId = (data as { id: string }).id;
      if (!companyId) companyId = (data as { company_id?: string }).company_id ?? "";
    }
  }
  if (!userId) return { companyId: "", userId: "", role: "", error: NextResponse.json({ error: "User not found" }, { status: 401 }) };

  if (!companyId) {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail,
        role,
        queryCompanyId: new URL(req.url).searchParams.get("companyId")?.trim() || undefined,
      })) || "";
  }

  const canArchive = ["admin", "superuser", "supervisor", "sub_admin"].includes(role);
  if (!canArchive) {
    return { companyId: "", userId: "", role: "", error: NextResponse.json({ error: "Forbidden: admin or supervisor required" }, { status: 403 }) };
  }

  const { data: thread } = await supabaseAdmin.from("message_threads").select("company_id").eq("id", threadId).single();
  if (!thread || (thread as { company_id: string }).company_id !== companyId) {
    return { companyId: "", userId: "", role: "", error: NextResponse.json({ error: "Thread not found" }, { status: 404 }) };
  }

  return { companyId, userId, role, error: null };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await ensureAccess(req, id);
    if (error) return error;

    const { error: updateErr } = await supabaseAdmin
      .from("message_threads")
      .update({ archived: true })
      .eq("id", id);

    if (updateErr) {
      console.error("POST /api/messages/thread/[id]/archive failed:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/messages/thread/[id]/archive failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
