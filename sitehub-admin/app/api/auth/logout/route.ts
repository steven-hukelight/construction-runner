import { NextResponse } from "next/server";
import { clearAuthCookiesOnResponse } from "@/lib/authCookies";

/**
 * POST /api/auth/logout
 * Clears HttpOnly auth cookies. Used by web, mobile, and session timeout.
 */
export async function POST() {
  try {
    const res = NextResponse.json({ success: true });
    clearAuthCookiesOnResponse(res);
    return res;
  } catch (e) {
    console.error("POST /api/auth/logout failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
