import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** List registrations. Superuser: all. Others: forbidden. */
export async function GET() {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .select("id, user_id, company_id, data, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("GET /api/registrations:", error);
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
