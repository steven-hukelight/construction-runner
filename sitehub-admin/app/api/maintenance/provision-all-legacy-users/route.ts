import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { provisionLegacyUser } from "@/lib/provisionLegacyUser";

/**
 * POST /api/maintenance/provision-all-legacy-users
 * Superuser only. Provisions auth accounts for all users in public.users
 * who do not yet have an auth.users record (e.g. legacy import).
 * After provisioning, users can log in via password reset.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: users, error: fetchErr } = await supabaseAdmin
      .from("users")
      .select("id, email, display_name, company_id, role, name, phone, superuser, approved");

    if (fetchErr || !users?.length) {
      return NextResponse.json({
        success: true,
        message: "No users to process.",
        provisioned: 0,
        skipped: 0,
        alreadyHadAuth: 0,
        errors: [],
      });
    }

    let provisioned = 0;
    let alreadyHadAuth = 0;
    const errors: string[] = [];

    for (const u of users) {
      const email = (u.email ?? "").trim();
      if (!email) {
        errors.push(`User ${u.id} has no email, skipped`);
        continue;
      }

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(u.id);
      if (authUser?.user) {
        alreadyHadAuth++;
        continue;
      }

      const result = await provisionLegacyUser({
        id: u.id,
        email,
        display_name: u.display_name ?? null,
        company_id: u.company_id ?? null,
        role: u.role ?? null,
        name: u.name ?? null,
        phone: u.phone ?? null,
        superuser: u.superuser ?? null,
        approved: u.approved ?? null,
      });

      if ("error" in result) {
        errors.push(`${email}: ${result.error}`);
      } else {
        provisioned++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Provisioned ${provisioned} legacy user(s). ${alreadyHadAuth} already had auth.`,
      provisioned,
      skipped: errors.filter((e) => e.includes("no email")).length,
      alreadyHadAuth,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    console.error("provision-all-legacy-users failed:", e);
    return NextResponse.json(
      { error: "Provision failed", message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
