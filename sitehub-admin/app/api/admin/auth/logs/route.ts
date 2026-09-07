/**
 * GET /api/admin/auth/logs
 * Fetch auth audit logs. Admin/superuser only.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();

  if (role !== "superuser" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const outcome = searchParams.get("outcome");

  try {
    let query = supabaseAdmin
      .from("auth_logs")
      .select("id, user_id, email_attempted, ip_address, user_agent, outcome, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (outcome && ["success", "failure", "blocked"].includes(outcome)) {
      query = query.eq("outcome", outcome);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      logs: data ?? [],
      total: count ?? 0,
    });
  } catch (e) {
    console.error("Auth logs fetch failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
