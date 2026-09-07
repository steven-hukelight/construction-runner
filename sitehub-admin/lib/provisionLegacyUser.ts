import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TABLES_TO_UPDATE: { table: string; column: string }[] = [
  { table: "attendance", column: "user_id" },
  { table: "tasks", column: "assigned_to" },
  { table: "deliveries", column: "delivered_by" },
  { table: "profiles", column: "user_id" },
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
  { table: "rams_acknowledgements", column: "user_id" },
  { table: "user_pre_induction_profile", column: "user_id" },
];

type LegacyUser = {
  id: string;
  email: string | null;
  display_name?: string | null;
  company_id?: string | null;
  role?: string | null;
  name?: string | null;
  phone?: string | null;
  superuser?: boolean | null;
  approved?: boolean | null;
};

/**
 * Provisions an auth.users record for a legacy user. Returns the new auth user id, or null if failed.
 */
export async function provisionLegacyUser(legacyUser: LegacyUser): Promise<{ userId: string } | { error: string }> {
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(legacyUser.id);
  if (authUser?.user) {
    return { userId: legacyUser.id };
  }

  const tempPassword = Math.random().toString(36).slice(2, 14) + "!A1a";
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: legacyUser.email!,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: legacyUser.display_name ?? undefined },
  });
  if (createErr) {
    if (createErr.message?.toLowerCase().includes("already been registered")) {
      return { userId: legacyUser.id };
    }
    return { error: createErr.message };
  }
  const newAuthId = created?.user?.id;
  if (!newAuthId) return { error: "Failed to create auth user" };

  await supabaseAdmin.auth.admin.updateUserById(newAuthId, {
    app_metadata: {
      role: (legacyUser.role ?? "operative").toLowerCase(),
      companyId: legacyUser.company_id ?? null,
      superuser: legacyUser.superuser ?? false,
      approved: legacyUser.approved ?? true,
    },
  });

  if (newAuthId === legacyUser.id) {
    return { userId: newAuthId };
  }

  for (const { table, column } of TABLES_TO_UPDATE) {
    const { error } = await supabaseAdmin.from(table).update({ [column]: newAuthId }).eq(column, legacyUser.id);
    if (error && error.code !== "42P01") {
      console.warn(`provisionLegacyUser: ${table}.${column} update failed`, error.message);
    }
  }

  await supabaseAdmin
    .from("users")
    .update({
      display_name: legacyUser.display_name ?? null,
      name: legacyUser.name ?? null,
      company_id: legacyUser.company_id ?? null,
      role: legacyUser.role ?? null,
      phone: legacyUser.phone ?? null,
      superuser: legacyUser.superuser ?? null,
      approved: legacyUser.approved ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", newAuthId);

  const { error: delErr } = await supabaseAdmin.from("users").delete().eq("id", legacyUser.id);
  if (delErr) {
    console.error("provisionLegacyUser: delete old user failed", delErr);
  }

  return { userId: newAuthId };
}
