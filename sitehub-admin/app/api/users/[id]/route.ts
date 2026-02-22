import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function cid(u: { company_id?: string | null }): string {
  return String(u.company_id ?? "").trim();
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const companyId = cookieStore.get("companyId")?.value;
    const userEmail = cookieStore.get("user_email")?.value;

    const { data: userRow } = await supabaseAdmin.from("users").select("*").eq("id", id).maybeSingle();
    if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userCompanyId = cid(userRow);
    const roleLower = (role ?? "").toLowerCase();
    const isSuperuser = roleLower === "superuser";
    let cookieCompanyId = (companyId ?? "").trim();

    // Fallback: if admin/supervisor lacks companyId cookie, derive from DB
    if (!cookieCompanyId && userEmail) {
      const { data: me } = await supabaseAdmin.from("users").select("company_id").eq("email", userEmail.trim()).limit(1).maybeSingle();
      if (me) cookieCompanyId = cid(me as { company_id?: string | null });
    }

    // Own profile: allow viewing self
    let isOwnProfile = false;
    if (userEmail) {
      const { data: me } = await supabaseAdmin.from("users").select("id").eq("email", userEmail.trim()).limit(1).maybeSingle();
      if (me?.id === id) isOwnProfile = true;
    }

    const sameCompany = cookieCompanyId && cookieCompanyId === userCompanyId;
    const canAccess = isSuperuser || isOwnProfile || sameCompany;
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const u = userRow as Record<string, unknown>;
    let name = (u.display_name ?? u.email ?? "—") as string;
    const { data: personal } = await supabaseAdmin
      .from("pre_induction_personal")
      .select("full_name, data")
      .eq("user_id", id)
      .maybeSingle();
    const fullName = personal
      ? ((personal as { full_name?: string | null; data?: Record<string, unknown> }).full_name
          ?? (personal as { data?: Record<string, unknown> }).data?.full_name
          ?? (personal as { data?: Record<string, unknown> }).data?.fullName
          ?? "")
      : "";
    if (fullName && String(fullName).trim()) name = String(fullName).trim();

    let companyName: string | null = null;
    if (userCompanyId) {
      const { data: co } = await supabaseAdmin.from("companies").select("name").eq("id", userCompanyId).maybeSingle();
      companyName = co?.name as string ?? null;
    }

    const { data: profileRows } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", id)
      .limit(1);
    const profile = (profileRows?.[0] ?? {}) as Record<string, unknown>;

    const preInductionStatus = (u.pre_induction_status ?? "not_started") as string;
    const adminPreInductionOverride = u.admin_pre_induction_override === true;

    return NextResponse.json({
      id: userRow.id,
      name,
      email: u.email,
      role: u.role,
      company_id: userCompanyId || undefined,
      companyId: userCompanyId || undefined,
      companyName: companyName ?? undefined,
      preInductionStatus,
      adminPreInductionOverride,
      addressLine1: profile.address_line1 ?? profile.address ?? undefined,
      town: profile.town ?? undefined,
      postcode: profile.postcode ?? undefined,
      jobTitle: profile.job_title ?? profile.jobtitle ?? undefined,
      emergencyContactName: profile.emergency_contact_name ?? undefined,
      emergencyContactPhone: profile.emergency_contact_phone ?? undefined,
      nationalInsurance: profile.ni_number ?? profile.national_insurance ?? undefined,
      utr: profile.utr_number ?? profile.utr ?? undefined,
      dateOfBirth: profile.date_of_birth ?? profile.dateofbirth ?? undefined,
      avatar: (u.avatar ?? profile.avatar_url ?? profile.avatar ?? undefined) as string | undefined,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const roleLower = (role ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId && roleLower !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }
    const isSuperuser = roleLower === "superuser";
    const isAdmin = roleLower === "admin" || roleLower === "sub_admin";
    if (!isSuperuser && !isAdmin) {
      return NextResponse.json(
        { error: "Only admins or superuser can update user roles" },
        { status: 403 }
      );
    }

    const { data: userRow } = await supabaseAdmin.from("users").select("*").eq("id", id).maybeSingle();
    if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const targetCompanyId = cid(userRow);
    if (!isSuperuser && companyId !== targetCompanyId) {
      return NextResponse.json({ error: "Forbidden: cannot update user in another company" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (body.role !== undefined) updates.role = body.role;
    const newCompanyId = body.company_id ?? body.companyId;
    if (newCompanyId !== undefined) {
      if (!isSuperuser) {
        return NextResponse.json({ error: "Only superuser can change user company" }, { status: 403 });
      }
      updates.company_id = newCompanyId;
    }
    if (body.approved !== undefined) updates.approved = body.approved;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", id)
      .select();
    if (updateError) {
      const err = updateError as { message?: string; code?: string; details?: string };
      console.error("PATCH /api/users/[id] update error:", err.message, err.code, err.details, "updates:", updates);
      return NextResponse.json(
        { error: err.message ?? err.details ?? "Failed to update user" },
        { status: 500 }
      );
    }
    if (!updated?.length) {
      return NextResponse.json({ error: "User not found or update affected no rows" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...updates });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update";
    console.error("PATCH /api/users/[id]:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const roleLower = (role ?? "").toLowerCase();
  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId && roleLower !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }
  if (roleLower !== "superuser" && roleLower !== "admin" && roleLower !== "sub_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (roleLower !== "superuser") {
    const { data: userRow } = await supabaseAdmin.from("users").select("company_id").eq("id", id).maybeSingle();
    if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (cid(userRow) !== companyId) {
      return NextResponse.json({ error: "Forbidden: cannot delete user in another company" }, { status: 403 });
    }
  }
  await supabaseAdmin.from("users").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
