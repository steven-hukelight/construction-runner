import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/debug-user-lookup?email=steven_hukelight@yahoo.co.uk
 * Tests user lookup - helps debug "account not set up" login errors.
 * Superuser only.
 */
export async function GET(req: Request) {
  const role = (await cookies()).get("role")?.value;
  if (role?.toLowerCase() !== "superuser") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = new URL(req.url).searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ error: "?email= required" }, { status: 400 });
  }

  const results: Record<string, unknown> = { email, steps: {} };

  try {
    // Step 1: exact match
    const exact = await supabaseAdmin
      .from("users")
      .select("id, email, role, company_id")
      .eq("email", email)
      .maybeSingle();
    results.steps = { ...(results.steps as object), exact: exact.data ?? exact.error };

    // Step 2: RPC
    const rpc = await supabaseAdmin.rpc("get_user_by_email", { search_email: email });
    results.steps = { ...(results.steps as object), rpc: rpc.data ?? rpc.error };

    // Step 3: ilike
    const pattern = email.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    const ilike = await supabaseAdmin
      .from("users")
      .select("id, email, role, company_id")
      .ilike("email", pattern)
      .maybeSingle();
    results.steps = { ...(results.steps as object), ilike: ilike.data ?? ilike.error };

    results.found = !!(exact.data || (Array.isArray(rpc.data) ? rpc.data[0] : rpc.data) || ilike.data);
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: String(e), email }, { status: 500 });
  }
}
