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

    const { data: profileRows } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .limit(1);

    const profileData = profileRows?.[0] ?? {};

    // Resolve display name: users.display_name, then pre_induction_personal, never email local-part for "name"
    let resolvedName: string | null = (userData.display_name ?? userData.name ?? userData.displayName ?? "") as string;
    if (!resolvedName || !String(resolvedName).trim()) {
      const { data: personal } = await supabaseAdmin
        .from("pre_induction_personal")
        .select("full_name, data")
        .eq("user_id", userId)
        .maybeSingle();
      const pr = personal as { full_name?: string | null; data?: Record<string, unknown> } | null;
      resolvedName = (pr?.full_name ?? pr?.data?.full_name ?? pr?.data?.fullName ?? "") as string;
    }
    if (!resolvedName || !String(resolvedName).trim()) resolvedName = null;

    const merged = {
      id: userId,
      email: userData.email ?? email,
      name: resolvedName,
      displayName: resolvedName,
      role: userData.role ?? "ADMIN",
      status: userData.status ?? "Active",
      createdAt: userData.createdat ?? userData.created_at ?? null,
      updatedAt: userData.updated_at ?? profileData.updated_at ?? null,
      joinedDate: userData.createdat ?? userData.created_at ?? null,
      phone: userData.phone ?? profileData.phone ?? null,
      avatar: userData.avatar ?? null,
      adminPreInductionOverride: !!(userData.admin_pre_induction_override ?? userData.adminPreInductionOverride),
      bio: userData.bio ?? null,
      addressLine1: profileData.address_line1 ?? profileData.address ?? null,
      location: profileData.address_line1 ?? profileData.town ?? null,
      address: profileData.address_line1 ?? profileData.address ?? null,
      town: profileData.town ?? null,
      postcode: profileData.postcode ?? null,
      dateOfBirth: profileData.date_of_birth ?? profileData.dateofbirth ?? null,
      dob: profileData.date_of_birth ?? profileData.dateofbirth ?? null,
      jobTitle: profileData.job_title ?? profileData.jobtitle ?? null,
      emergencyContactName: profileData.emergency_contact_name ?? profileData.emergencycontactname ?? null,
      emergencyContactPhone: profileData.emergency_contact_phone ?? profileData.emergencycontactphone ?? null,
      emergencyPhone: profileData.emergency_contact_phone ?? profileData.emergencycontactphone ?? null,
      emergencyContactNumber: profileData.emergency_contact_phone ?? profileData.emergencycontactphone ?? null,
      nationalInsurance: profileData.ni_number ?? profileData.national_insurance ?? profileData.nationalinsurance ?? null,
      utr: profileData.utr_number ?? profileData.utr ?? null,
      notes: userData.notes ?? null,
    };

    return NextResponse.json([merged]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/profiles/me failed:", msg);
    return NextResponse.json([], { status: 200 });
  }
}
