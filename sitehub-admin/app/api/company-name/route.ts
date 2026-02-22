import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const companyIdParam = new URL(req.url).searchParams.get("companyId");
    if (!companyIdParam) return NextResponse.json({ error: "companyId required" }, { status: 400 });

    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value?.toLowerCase();
    const userCompanyId = cookieStore.get("companyId")?.value?.trim();
    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (role !== "superuser" && userCompanyId !== companyIdParam) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data } = await supabaseAdmin.from("companies").select("name").eq("id", companyIdParam).single();
    const name = data?.name ?? null;
    return NextResponse.json({ name });
  } catch {
    return NextResponse.json({ name: null }, { status: 200 });
  }
}
