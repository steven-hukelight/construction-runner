import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/auth/logout
 * Clears role, user_email, companyId, and impersonating cookies.
 * Used by mobile app and any client using cookie-based auth.
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const names = ["role", "user_email", "uid", "companyId", "impersonating"];

    for (const name of names) {
      cookieStore.set(name, "", { path: "/", maxAge: 0 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/auth/logout failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
