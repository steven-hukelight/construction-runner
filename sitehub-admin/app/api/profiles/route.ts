import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

async function canEditProfile(userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const email = cookieStore.get("user_email")?.value;
  const role = cookieStore.get("role")?.value;
  if (!email) return false;
  if (role === "superuser") return true;

  const { data: myUsers } = await supabaseAdmin.from("users").select("id, company_id").eq("email", email).limit(1);
  if (!myUsers?.length) return false;
  const myRow = myUsers[0];
  const myId = myRow.id;
  if (myId === userId) return true;

  const { data: target } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).single();
  if (!target) return false;
  const targetCompanyId = String(target.company_id ?? "").trim();
  let cookieCompanyId = (cookieStore.get("companyId")?.value ?? "").trim();
  if (!cookieCompanyId && role !== "superuser") {
    cookieCompanyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || "";
  }
  return !!targetCompanyId && targetCompanyId === cookieCompanyId;
}

function toIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v !== null && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function serializeRow(row: Record<string, unknown> | null): Record<string, unknown> {
  if (!row) return {};
  const out = { ...row };
  if (out.createdat) out.createdAt = toIso(out.createdat);
  if (out.updated_at) out.updatedAt = toIso(out.updated_at);
  if (out.dateofbirth || out.date_of_birth) out.dateOfBirth = out.dateofbirth ?? out.date_of_birth;
  return out;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (userId) {
      const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
      if (!user) return NextResponse.json([]);

      if (!(await canEditProfile(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const [profileRes, personalRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("user_id", userId).limit(1),
        supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      const profile = profileRes.data?.[0] ?? {};
      const personalRow = personalRes.data as { full_name?: string; phone?: string; address?: string; emergency_contact_name?: string; emergency_contact_phone?: string; national_insurance?: string; utr?: string; date_of_birth?: string } | null;
      const merged: Record<string, unknown> = { id: userId, ...serializeRow(user as Record<string, unknown>), ...serializeRow(profile as Record<string, unknown>) };
      if (personalRow) {
        merged.name = personalRow.full_name ?? merged.name ?? merged.display_name;
      }
      // Profile table is source of truth for profile fields (address, emergency contact, etc.)
      // merged already has profile data from spread; only fallback to personal when profile is empty
      if (personalRow) {
        if (!merged.address_line1 && !merged.address) merged.address_line1 = personalRow.address;
        if (!merged.phone) merged.phone = personalRow.phone;
        if (!merged.emergency_contact_name) merged.emergency_contact_name = personalRow.emergency_contact_name;
        if (!merged.emergency_contact_phone) merged.emergency_contact_phone = personalRow.emergency_contact_phone;
        if (!merged.ni_number) merged.ni_number = personalRow.national_insurance;
        if (!merged.utr_number) merged.utr_number = personalRow.utr;
        if (!merged.date_of_birth) merged.date_of_birth = personalRow.date_of_birth;
      }
      mapProfileToResponse(merged);
      return NextResponse.json([merged]);
    }

    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }
    if (role !== "superuser" && !companyId) return NextResponse.json([]);

    let query = supabaseAdmin.from("users").select("*");
    if (role !== "superuser" && companyId) query = query.eq("company_id", companyId);
    const { data: users } = await query;
    const out: Record<string, unknown>[] = [];
    for (const u of users ?? []) {
      const uid = u.id;
      const [profileRes, personalRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("user_id", uid).limit(1),
        supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", uid).maybeSingle(),
      ]);
      const profile = profileRes.data?.[0] ?? {};
      const personalRow = personalRes.data as { full_name?: string; phone?: string; address?: string; emergency_contact_name?: string; emergency_contact_phone?: string; national_insurance?: string; utr?: string; date_of_birth?: string } | null;
      const merged: Record<string, unknown> = { id: uid, ...serializeRow(u as Record<string, unknown>), ...serializeRow(profile as Record<string, unknown>) };
      if (personalRow) {
        merged.name = personalRow.full_name ?? merged.name ?? merged.display_name;
      }
      if (personalRow) {
        if (!merged.address_line1 && !merged.address) merged.address_line1 = personalRow.address;
        if (!merged.phone) merged.phone = personalRow.phone;
        if (!merged.emergency_contact_name) merged.emergency_contact_name = personalRow.emergency_contact_name;
        if (!merged.emergency_contact_phone) merged.emergency_contact_phone = personalRow.emergency_contact_phone;
        if (!merged.ni_number) merged.ni_number = personalRow.national_insurance;
        if (!merged.utr_number) merged.utr_number = personalRow.utr;
        if (!merged.date_of_birth) merged.date_of_birth = personalRow.date_of_birth;
      }
      mapProfileToResponse(merged);
      out.push(merged);
    }
    return NextResponse.json(out);
  } catch (e: unknown) {
    console.error("GET /api/profiles failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}

function mapProfileToResponse(obj: Record<string, unknown>) {
  obj.displayName = obj.displayName ?? obj.name ?? obj.email?.toString()?.split("@")[0];
  obj.addressLine1 = obj.addressLine1 ?? obj.address_line1 ?? obj.address;
  obj.jobTitle = obj.jobTitle ?? obj.jobtitle ?? obj.job_title;
  obj.emergencyContactName = obj.emergencyContactName ?? obj.emergencycontactname ?? obj.emergency_contact_name;
  obj.emergencyContactPhone = obj.emergencyContactPhone ?? obj.emergencycontactphone ?? obj.emergency_contact_phone;
  obj.nationalInsurance = obj.nationalInsurance ?? obj.ni_number ?? obj.nationalinsurance ?? obj.national_insurance;
  obj.dateOfBirth = obj.dateOfBirth ?? obj.dateofbirth ?? obj.date_of_birth;
  obj.utr = obj.utr ?? obj.utr_number;
  obj.avatar = obj.avatar ?? obj.avatar_url ?? obj.avatarUrl;
  obj.avatarUrl = obj.avatarUrl ?? obj.avatar ?? obj.avatar_url;
}

const PROFILE_FIELDS = [
  "addressLine1", "town", "postcode", "jobTitle", "emergencyContactName", "emergencyContactPhone",
  "nationalInsurance", "utr", "dateOfBirth",
];

const PROFILE_DB_MAP: Record<string, string> = {
  addressLine1: "address_line1", town: "town", postcode: "postcode", jobTitle: "job_title",
  emergencyContactName: "emergency_contact_name", emergencyContactPhone: "emergency_contact_phone",
  nationalInsurance: "ni_number", utr: "utr_number", dateOfBirth: "date_of_birth",
};

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const userId = String(body.userId || "").trim();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    if (!(await canEditProfile(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const profileUpdate: Record<string, unknown> = {};
    for (const f of PROFILE_FIELDS) {
      if (body[f] !== undefined) {
        const dbKey = PROFILE_DB_MAP[f] ?? f.toLowerCase().replace(/([A-Z])/g, "_$1").toLowerCase();
        profileUpdate[dbKey] = f === "restrictNonEssentialProcessing" ? !!body[f] : (body[f] ?? "");
      }
    }

    // Update users table when only user-level fields are passed
    const userUpdate: Record<string, unknown> = {};
    if (body.displayName !== undefined) userUpdate.display_name = body.displayName;
    if (body.name !== undefined) userUpdate.display_name = body.name;
    if (body.email !== undefined) userUpdate.email = body.email;
    if (body.phone !== undefined) userUpdate.phone = body.phone;
    if (body.role !== undefined) userUpdate.role = body.role;
    if (body.status !== undefined) userUpdate.status = body.status;
    if (body.notes !== undefined) userUpdate.notes = body.notes;
    if (Object.keys(userUpdate).length > 0) {
      userUpdate.updated_at = new Date().toISOString();
      await supabaseAdmin.from("users").update(userUpdate).eq("id", userId);
    }

    if (Object.keys(profileUpdate).length > 0) {
      profileUpdate.updated_at = new Date().toISOString();
      profileUpdate.user_id = userId;
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("profiles").insert({
          id: crypto.randomUUID(),
          user_id: userId,
          ...profileUpdate,
        });
      }
    }

    // Sync to pre_induction_personal when name/phone or profile fields change (linked)
    const hasProfileFields = Object.keys(profileUpdate).length > 0;
    const hasNameOrPhone = body.displayName !== undefined || body.name !== undefined || body.phone !== undefined;
    if (hasProfileFields || hasNameOrPhone) {
      try {
        if (hasProfileFields) {
          const addressParts = [
            body.addressLine1 ?? profileUpdate.address_line1 ?? "",
            body.town ?? profileUpdate.town ?? "",
            body.postcode ?? profileUpdate.postcode ?? "",
          ].filter(Boolean);
          const personalPayload: Record<string, unknown> = {
            user_id: userId,
            address: addressParts.join(", ") || null,
            emergency_contact_name: body.emergencyContactName ?? profileUpdate.emergency_contact_name ?? "",
            emergency_contact_phone: body.emergencyContactPhone ?? profileUpdate.emergency_contact_phone ?? "",
            national_insurance: body.nationalInsurance ?? profileUpdate.ni_number ?? "",
            utr: body.utr ?? profileUpdate.utr_number ?? "",
            date_of_birth: body.dateOfBirth ?? profileUpdate.date_of_birth ?? null,
            updated_at: new Date().toISOString(),
          };
          if (body.displayName !== undefined || body.name !== undefined) {
            personalPayload.full_name = body.displayName ?? body.name ?? "";
          }
          if (body.phone !== undefined) {
            personalPayload.phone = body.phone;
          }
          await supabaseAdmin.from("pre_induction_personal").upsert(personalPayload, { onConflict: "user_id" });
        } else {
          // Name/phone only: update without overwriting other personal fields
          const namePhoneUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (body.displayName !== undefined || body.name !== undefined) {
            namePhoneUpdate.full_name = body.displayName ?? body.name ?? "";
          }
          if (body.phone !== undefined) {
            namePhoneUpdate.phone = body.phone;
          }
          const { data: existing } = await supabaseAdmin.from("pre_induction_personal").select("user_id").eq("user_id", userId).maybeSingle();
          if (existing) {
            await supabaseAdmin.from("pre_induction_personal").update(namePhoneUpdate).eq("user_id", userId);
          } else {
            await supabaseAdmin.from("pre_induction_personal").insert({
              user_id: userId,
              full_name: namePhoneUpdate.full_name ?? "",
              phone: namePhoneUpdate.phone ?? null,
              updated_at: namePhoneUpdate.updated_at,
            });
          }
        }
      } catch (syncErr) {
        console.warn("Profiles->pre_induction_personal sync:", syncErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("PATCH /api/profiles failed:", e);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
