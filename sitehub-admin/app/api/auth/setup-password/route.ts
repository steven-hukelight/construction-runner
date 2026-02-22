import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/auth/setup-password
 * Sets a new password for the user given email and password.
 * Body: { email: string, password: string }
 */
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("setup-password listUsers failed", listError);
      return NextResponse.json({ error: "User lookup failed" }, { status: 500 });
    }

    const user = users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });

    if (updateError) {
      console.error("setup-password updateUserById failed", updateError);
      return NextResponse.json({ error: updateError.message || "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    console.error("setup-password failed", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
