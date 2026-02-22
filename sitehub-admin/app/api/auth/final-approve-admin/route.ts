import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Superuser final approval for company admin after setup is complete. */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const { data: users } = await supabaseAdmin.from("users").select("id, display_name, role, company_id").eq("email", email).limit(1);
    if (!users?.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const user = users[0];
    await supabaseAdmin.from("users").update({
      display_name: user.display_name || email.split("@")[0] || "",
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        approved: true,
        role: user.role,
        companyId: user.company_id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("final-approve-admin failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
