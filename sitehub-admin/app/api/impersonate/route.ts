import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_MAX_AGE_REMEMBER } from "@/lib/securityConfig";

/** Impersonate a company (set companyId cookie). Superuser only. Cookie value must be Supabase UUID (companies.id). */
export async function POST(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    if ((role ?? "").toLowerCase() !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const companyId = body.company_id ?? body.companyId;
    if (!companyId) return NextResponse.json({ error: "company_id required" }, { status: 400 });
    const maxAge = COOKIE_MAX_AGE_REMEMBER;
    const res = NextResponse.json({ ok: true });
    res.cookies.set("impersonating", "true", { path: "/", maxAge, httpOnly: false, sameSite: "lax" });
    res.cookies.set("companyId", companyId, { path: "/", maxAge, httpOnly: false, sameSite: "lax" });
    return res;
  } catch (e) {
    console.error("POST /api/impersonate failed", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
