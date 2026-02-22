import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

function cid(x: { company_id?: string | null }): string | null {
  return (x.company_id ?? null) as string | null;
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data } = await supabaseAdmin.from("coshh").select("*").eq("id", id).single();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "superuser") {
    if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (cid(data) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabaseAdmin.from("coshh").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
