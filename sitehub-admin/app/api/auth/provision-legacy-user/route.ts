import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Provisions an auth.users record for a legacy user who exists in public.users
 * but not in auth.users (e.g. migrated from Firebase).
 * Creates the auth user and merges so the existing public.users row is preserved
 * with the new auth id. Call this before send-password-reset for legacy users.
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    let role = cookieStore.get("role")?.value;
    const roleLower = (role ?? "").toLowerCase();
    if (roleLower !== "superuser" && roleLower !== "admin") {
      const userEmail = cookieStore.get("user_email")?.value?.trim();
      if (userEmail) {
        const { data: u } = await supabaseAdmin.from("users").select("role").eq("email", userEmail).maybeSingle();
        const dbRole = (u?.role ?? "").toLowerCase();
        if (dbRole === "superuser" || dbRole === "admin") role = dbRole;
      }
    }
    const effectiveRole = (role ?? "").toLowerCase();
    if (effectiveRole !== "superuser" && effectiveRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = body.userId?.trim();
    const email = body.email?.trim();
    if (!userId && !email) {
      return NextResponse.json({ error: "userId or email required" }, { status: 400 });
    }

    let legacyUser: { id: string; email: string | null; display_name?: string; company_id?: string | null; role?: string | null; name?: string | null; phone?: string | null; superuser?: boolean | null; approved?: boolean | null } | null = null;
    if (userId) {
      const { data } = await supabaseAdmin.from("users").select("id, email, display_name, company_id, role, name, phone, superuser, approved").eq("id", userId).maybeSingle();
      legacyUser = data;
    } else if (email) {
      const { data } = await supabaseAdmin.from("users").select("id, email, display_name, company_id, role, name, phone, superuser, approved").eq("email", email).maybeSingle();
      legacyUser = data;
    }
    if (!legacyUser || !legacyUser.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(legacyUser.id);
    if (authUser?.user) {
      return NextResponse.json({ ok: true, message: "User already has auth account. Use Send reset email.", userId: legacyUser.id });
    }

    const tempPassword = Math.random().toString(36).slice(2, 14) + "!A1a";
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: legacyUser.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: legacyUser.display_name ?? undefined },
    });
    if (createErr) {
      if (createErr.message?.toLowerCase().includes("already been registered")) {
        return NextResponse.json({ ok: true, message: "Auth user exists for this email. Use Send reset email." });
      }
      console.error("provision-legacy-user createUser failed", createErr);
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }
    const newAuthId = created?.user?.id;
    if (!newAuthId) {
      return NextResponse.json({ error: "Failed to create auth user" }, { status: 500 });
    }

    await supabaseAdmin.auth.admin.updateUserById(newAuthId, {
      app_metadata: {
        role: (legacyUser.role ?? "operative").toLowerCase(),
        companyId: legacyUser.company_id ?? null,
        superuser: legacyUser.superuser ?? false,
        approved: legacyUser.approved ?? true,
      },
    });

    if (newAuthId === legacyUser.id) {
      return NextResponse.json({ ok: true, message: "Auth user provisioned.", userId: newAuthId });
    }

    const tablesToUpdate: { table: string; column: string }[] = [
      { table: "attendance", column: "user_id" },
      { table: "tasks", column: "assigned_to" },
      { table: "deliveries", column: "delivered_by" },
      { table: "profiles", column: "user_id" },
      { table: "notices_read", column: "user_id" },
      { table: "upload_logs", column: "user_id" },
      { table: "near_miss", column: "operative_id" },
      { table: "offline_queue", column: "user_id" },
      { table: "asset_assignments", column: "user_id" },
      { table: "asset_inspections", column: "user_id" },
      { table: "message_threads", column: "created_by" },
      { table: "messages_thread", column: "sender_id" },
      { table: "message_recipients", column: "user_id" },
      { table: "sites", column: "manager_id" },
      { table: "certifications", column: "user_id" },
      { table: "medical_records", column: "user_id" },
      { table: "attendance_archive", column: "user_id" },
      { table: "pre_induction_personal", column: "user_id" },
      { table: "pre_induction_right_to_work", column: "user_id" },
      { table: "pre_induction_certifications", column: "user_id" },
      { table: "pre_induction_medical", column: "user_id" },
      { table: "task_assignments", column: "user_id" },
      { table: "user_profile_data", column: "user_id" },
      { table: "assigned_operatives", column: "user_id" },
      { table: "user_site_inductions", column: "user_id" },
      { table: "briefing_acknowledgements", column: "user_id" },
      { table: "user_pre_induction_profile", column: "user_id" },
    ];

    for (const { table, column } of tablesToUpdate) {
      const { error } = await supabaseAdmin.from(table).update({ [column]: newAuthId }).eq(column, legacyUser.id);
      if (error) {
        if (error.code === "42P01") continue;
        console.warn(`provision-legacy-user: ${table}.${column} update failed`, error.message);
      }
    }

    await supabaseAdmin.from("users").update({
      display_name: legacyUser.display_name ?? null,
      name: legacyUser.name ?? null,
      company_id: legacyUser.company_id ?? null,
      role: legacyUser.role ?? null,
      phone: legacyUser.phone ?? null,
      superuser: legacyUser.superuser ?? null,
      approved: legacyUser.approved ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", newAuthId);

    const { error: delErr } = await supabaseAdmin.from("users").delete().eq("id", legacyUser.id);
    if (delErr) {
      console.error("provision-legacy-user: delete old user failed (merge incomplete)", delErr);
      return NextResponse.json({
        ok: true,
        message: "Auth user created. You can send reset email. (Merge incomplete - duplicate user row may exist.)",
        userId: newAuthId,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Legacy user provisioned. You can now send a password reset email.",
      userId: newAuthId,
    });
  } catch (err) {
    console.error("provision-legacy-user failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
