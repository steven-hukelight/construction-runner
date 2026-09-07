/**
 * Missing Info report — lists workers whose My Info is incomplete.
 *
 * GET  /api/admin/missing-info                 -> JSON list
 * GET  /api/admin/missing-info?format=csv      -> CSV download
 * GET  /api/admin/missing-info?siteId=<uuid>   -> only workers assigned to that site
 *
 * "Incomplete" today means either:
 *   - no emergency contact name AND no emergency contact phone, OR
 *   - no medical row (or medical row exists but medicalDeclaration is empty)
 *
 * Auth: admin, supervisor, or superuser. Company-scoped.
 * Replaces the old /dashboard/induction-compliance dashboard.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export const dynamic = "force-dynamic";

type Row = {
  userId: string;
  name: string;
  email: string;
  role: string | null;
  companyId: string | null;
  missingEmergencyContact: boolean;
  missingMedicalInfo: boolean;
};

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "json").toLowerCase();
    const siteId = url.searchParams.get("siteId")?.trim() || null;

    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    const isPrivilegedRole = ["admin", "supervisor", "superuser"].includes(role);
    if (!isPrivilegedRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let companyId: string | undefined = cookieStore.get("companyId")?.value?.trim() || undefined;
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }
    if (role !== "superuser" && !companyId) {
      return NextResponse.json([], { status: 200 });
    }

    // 1. Users in scope. Optional site filter via attendance/site_operatives assignments.
    let userQuery = supabaseAdmin
      .from("users")
      .select("id, email, display_name, role, company_id, status");
    if (role !== "superuser" && companyId) {
      userQuery = userQuery.eq("company_id", companyId);
    }
    const { data: allUsers, error: usersErr } = await userQuery;
    if (usersErr) throw new Error(`users query: ${usersErr.message}`);

    let userIds = (allUsers ?? []).map((u) => String(u.id));
    if (userIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Optional site filter — narrow userIds to those assigned to the site.
    if (siteId) {
      const { data: siteAssignments } = await supabaseAdmin
        .from("assigned_operatives")
        .select("user_id")
        .eq("site_id", siteId);
      const assignedIds = new Set((siteAssignments ?? []).map((r) => String((r as { user_id: string }).user_id)));
      userIds = userIds.filter((id) => assignedIds.has(id));
      if (userIds.length === 0) return NextResponse.json([], { status: 200 });
    }

    // 2. Fetch emergency contact from user_profile_data and pre_induction_personal (legacy)
    //    plus medical row in parallel.
    const [profileDataRes, personalRes, medicalRes] = await Promise.all([
      supabaseAdmin
        .from("user_profile_data")
        .select("user_id, emergency_contact_name, emergency_contact_phone")
        .in("user_id", userIds),
      supabaseAdmin
        .from("pre_induction_personal")
        .select("user_id, emergency_contact_name, emergency_contact_phone")
        .in("user_id", userIds),
      supabaseAdmin
        .from("pre_induction_medical")
        .select("user_id, medical_declaration, medical_verified")
        .in("user_id", userIds),
    ]);

    const profileByUser = new Map<string, { name: string | null; phone: string | null }>();
    for (const r of profileDataRes.data ?? []) {
      const row = r as { user_id: string; emergency_contact_name: string | null; emergency_contact_phone: string | null };
      profileByUser.set(row.user_id, { name: row.emergency_contact_name, phone: row.emergency_contact_phone });
    }
    const personalByUser = new Map<string, { name: string | null; phone: string | null }>();
    for (const r of personalRes.data ?? []) {
      const row = r as { user_id: string; emergency_contact_name: string | null; emergency_contact_phone: string | null };
      personalByUser.set(row.user_id, { name: row.emergency_contact_name, phone: row.emergency_contact_phone });
    }
    const medicalByUser = new Map<string, { declaration: string | null; verified: boolean }>();
    for (const r of medicalRes.data ?? []) {
      const row = r as { user_id: string; medical_declaration: string | null; medical_verified: boolean | null };
      medicalByUser.set(row.user_id, {
        declaration: row.medical_declaration,
        verified: !!row.medical_verified,
      });
    }

    // 3. Assemble rows and filter to only those with at least one missing piece.
    const rows: Row[] = [];
    const filteredUsers = allUsers!.filter((u) => userIds.includes(String(u.id)));
    for (const u of filteredUsers) {
      const uid = String(u.id);
      const profile = profileByUser.get(uid);
      const personal = personalByUser.get(uid);
      const medical = medicalByUser.get(uid);

      const name = ((profile?.name ?? "").trim() || (personal?.name ?? "").trim()) || null;
      const phone = ((profile?.phone ?? "").trim() || (personal?.phone ?? "").trim()) || null;
      const missingEmergency = !name && !phone;
      const missingMedical = !medical || !(medical.declaration ?? "").trim();

      if (missingEmergency || missingMedical) {
        rows.push({
          userId: uid,
          name: String((u as { display_name?: string }).display_name ?? (u as { email?: string }).email ?? ""),
          email: String((u as { email?: string }).email ?? ""),
          role: (u as { role?: string | null }).role ?? null,
          companyId: (u as { company_id?: string | null }).company_id ?? null,
          missingEmergencyContact: missingEmergency,
          missingMedicalInfo: missingMedical,
        });
      }
    }

    // 4. CSV or JSON.
    if (format === "csv") {
      const header = ["userId", "name", "email", "role", "missingEmergencyContact", "missingMedicalInfo"];
      const body = rows.map((r) =>
        [r.userId, r.name, r.email, r.role ?? "", r.missingEmergencyContact, r.missingMedicalInfo]
          .map(csvEscape)
          .join(","),
      );
      const csv = [header.join(","), ...body].join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="missing-info-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json(rows);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/admin/missing-info] GET failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
