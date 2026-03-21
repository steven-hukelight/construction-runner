import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * GET /api/profiles/me
 * Returns the current user's profile (user + profiles).
 * Uses user_email cookie - works for all roles (superuser and company admins).
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("user_email")?.value;
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: users } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email.trim())
      .limit(1);

    if (!users || users.length === 0) {
      return NextResponse.json([]);
    }

    const userData = users[0] as Record<string, unknown>;
    const userId = userData.id as string;

    const [profileRes, personalRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("user_id", userId).limit(1),
      supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    const profileData = profileRes.data?.[0] ?? {};
    const personalRow = personalRes.data as {
      full_name?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      emergency_contact_name?: string | null;
      emergency_contact_relationship?: string | null;
      emergency_contact_phone?: string | null;
      national_insurance?: string | null;
      utr?: string | null;
      date_of_birth?: string | null;
      updated_at?: string | null;
      data?: Record<string, unknown>;
    } | null;

    // Name: personal settings (pre_induction_personal) is source of truth, then users, never role
    const prData = personalRow?.data ?? {};
    let resolvedName: string | null = (
      personalRow?.full_name ??
      prData?.full_name ??
      prData?.fullName ??
      userData.display_name ??
      userData.name ??
      userData.displayName ??
      ""
    ) as string;
    if (!resolvedName || !String(resolvedName).trim()) {
      const local = (email || "").split("@")[0]?.trim();
      resolvedName = local ? local.charAt(0).toUpperCase() + local.slice(1).toLowerCase() : null;
    }

    // Merge: Profile settings from profiles table (source of truth), fallback to pre_induction_personal
    const merged = {
      id: userId,
      email: userData.email ?? personalRow?.email ?? email,
      name: resolvedName,
      displayName: resolvedName,
      role: userData.role ?? "ADMIN",
      status: userData.status ?? "Active",
      createdAt: userData.createdat ?? userData.created_at ?? null,
      updatedAt: userData.updated_at ?? profileData.updated_at ?? personalRow?.updated_at ?? null,
      joinedDate: userData.createdat ?? userData.created_at ?? null,
      phone: profileData.phone ?? userData.phone ?? personalRow?.phone ?? null,
      avatar: userData.avatar ?? null,
      adminPreInductionOverride: !!(userData.admin_pre_induction_override ?? userData.adminPreInductionOverride),
      bio: userData.bio ?? null,
      addressLine1: profileData.address_line1 ?? profileData.address ?? personalRow?.address ?? null,
      location: profileData.address_line1 ?? profileData.address ?? profileData.town ?? personalRow?.address ?? null,
      address: profileData.address_line1 ?? profileData.address ?? personalRow?.address ?? null,
      town: profileData.town ?? null,
      postcode: profileData.postcode ?? null,
      dateOfBirth: profileData.date_of_birth ?? profileData.dateofbirth ?? personalRow?.date_of_birth ?? null,
      dob: profileData.date_of_birth ?? profileData.dateofbirth ?? personalRow?.date_of_birth ?? null,
      jobTitle: profileData.job_title ?? profileData.jobtitle ?? null,
      emergencyContactName: profileData.emergency_contact_name ?? profileData.emergencycontactname ?? personalRow?.emergency_contact_name ?? null,
      emergencyContactPhone: profileData.emergency_contact_phone ?? profileData.emergencycontactphone ?? personalRow?.emergency_contact_phone ?? null,
      emergencyPhone: profileData.emergency_contact_phone ?? profileData.emergencycontactphone ?? personalRow?.emergency_contact_phone ?? null,
      emergencyContactNumber: profileData.emergency_contact_phone ?? profileData.emergencycontactphone ?? personalRow?.emergency_contact_phone ?? null,
      nationalInsurance: profileData.ni_number ?? profileData.national_insurance ?? profileData.nationalinsurance ?? personalRow?.national_insurance ?? null,
      utr: profileData.utr_number ?? profileData.utr ?? personalRow?.utr ?? null,
      notes: userData.notes ?? null,
    };

    return NextResponse.json([merged]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/profiles/me failed:", msg);
    return NextResponse.json([], { status: 200 });
  }
}
