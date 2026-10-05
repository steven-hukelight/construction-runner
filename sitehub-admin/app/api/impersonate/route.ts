import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_MAX_AGE_REMEMBER } from "@/lib/securityConfig";
import { authCookieSetOptions } from "@/lib/authCookies";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Impersonate a company (set companyId cookie). Superuser only. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedId = String(body.company_id ?? body.companyId ?? "").trim();
    if (!requestedId) {
      return NextResponse.json({ error: "company_id required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    if ((role ?? "").toLowerCase() !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: company, error } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", requestedId)
      .maybeSingle();
    if (error) {
      console.error("POST /api/impersonate company lookup failed", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    const companyId = company?.id != null ? String(company.id) : "";
    if (!companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const maxAge = COOKIE_MAX_AGE_REMEMBER;
    const opts = authCookieSetOptions(maxAge);
    cookieStore.set("impersonating", "true", opts);
    cookieStore.set("companyId", companyId, opts);
    const res = NextResponse.json({ ok: true });
    res.cookies.set("impersonating", "true", opts);
    res.cookies.set("companyId", companyId, opts);
    return res;
  } catch (e) {
    console.error("POST /api/impersonate failed", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
