import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }
    if (role === "superuser") {
      companyId = searchParams.get("companyId") || companyId || undefined;
      if (companyId) {
        const { data } = await supabaseAdmin
          .from("notices")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });
        return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
      }
      const { data } = await supabaseAdmin.from("notices").select("*").order("created_at", { ascending: false });
      return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
    }
    const roleLower = (role ?? "").toLowerCase();
    if (roleLower === "operative") {
      return NextResponse.json([]);
    }
    if (companyId) {
      const { data } = await supabaseAdmin
        .from("notices")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
    }
    return NextResponse.json([], { status: 200 });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("GET /api/notices failed:", err?.message || e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }
  const assignedCompanyId = role === "superuser" ? (body.companyId ?? companyId ?? null) : (companyId ?? null);
  if (!assignedCompanyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("notices").insert({
    title: body.title,
    body: body.body,
    company_id: assignedCompanyId,
  }).select("id").single();

  if (error) {
    console.error("POST /api/notices failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id }, { status: 201 });
}
