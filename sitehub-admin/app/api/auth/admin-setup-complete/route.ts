import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Marks the admin's setup as complete after they set their password. */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const { data: users } = await supabaseAdmin.from("users").select("id, display_name").eq("email", email).limit(1);
    if (!users?.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const u = users[0];
    await supabaseAdmin
      .from("users")
      .update({ display_name: (u as { name?: string }).name ?? u.display_name ?? "" })
      .eq("id", u.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin-setup-complete failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
