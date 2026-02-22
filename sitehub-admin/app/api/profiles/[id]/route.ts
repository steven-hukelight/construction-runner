import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

async function ensureProfileAccess(userId: string, userData: Record<string, unknown>): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId && role !== "superuser") {
    companyId =
      (await import("@/lib/auth/companyId").then((m) =>
        m.resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })
      )) || undefined;
  }
  const userEmail = cookieStore.get("user_email")?.value;
  if (role === "superuser") return null;
  const targetCompanyId = userData.company_id != null ? String(userData.company_id) : null;
  const targetCompany = targetCompanyId != null ? String(targetCompanyId) : null;
  const targetEmail = userData.email != null ? String(userData.email) : null;
  if (targetCompany && companyId && targetCompany === companyId) return null;
  if (userEmail && targetEmail && userEmail === targetEmail) return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function mapProfileToResponse(obj: Record<string, unknown>) {
  obj.displayName = obj.displayName ?? obj.name ?? obj.email?.toString()?.split("@")[0];
  obj.addressLine1 = obj.addressLine1 ?? obj.address;
  obj.jobTitle = obj.jobTitle ?? obj.jobtitle ?? obj.job_title;
  obj.emergencyContactName = obj.emergencyContactName ?? obj.emergencycontactname ?? obj.emergency_contact_name;
  obj.emergencyContactPhone = obj.emergencyContactPhone ?? obj.emergencycontactphone ?? obj.emergency_contact_phone;
  obj.nationalInsurance = obj.nationalInsurance ?? obj.nationalinsurance ?? obj.national_insurance;
  obj.dateOfBirth = obj.dateOfBirth ?? obj.dateofbirth ?? obj.date_of_birth;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: user, error: userErr } = await supabaseAdmin.from("users").select("*").eq("id", id).single();
  if (userErr || !user) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const forbid = await ensureProfileAccess(id, user as Record<string, unknown>);
  if (forbid) return forbid;

  const { data: profileRows } = await supabaseAdmin
    .from("user_profile_data")
    .select("*")
    .or(`userid.eq.${id},user_id.eq.${id}`)
    .limit(1);
  const profile = profileRows?.[0] ?? {};
  const merged = { id, ...serializeRow(user as Record<string, unknown>), ...serializeRow(profile as Record<string, unknown>) };
  mapProfileToResponse(merged);
  return NextResponse.json(merged);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: user, error: userErr } = await supabaseAdmin.from("users").select("*").eq("id", id).single();
  if (userErr || !user) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const forbid = await ensureProfileAccess(id, user as Record<string, unknown>);
  if (forbid) return forbid;

  const body = await req.json();

  const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.addressLine1 === "string") profileUpdate.address = body.addressLine1;
  if (typeof body.town === "string") profileUpdate.town = body.town;
  if (typeof body.postcode === "string") profileUpdate.postcode = body.postcode;
  if (typeof body.jobTitle === "string") profileUpdate.job_title = body.jobTitle;
  if (typeof body.emergencyContactName === "string") profileUpdate.emergency_contact_name = body.emergencyContactName;
  if (typeof body.emergencyContactPhone === "string") profileUpdate.emergency_contact_phone = body.emergencyContactPhone;
  if (typeof body.nationalInsurance === "string") profileUpdate.national_insurance = body.nationalInsurance;
  if (typeof body.utr === "string") profileUpdate.utr = body.utr;
  if (body.dateOfBirth) {
    const dob = new Date(body.dateOfBirth);
    if (!isNaN(dob.getTime())) profileUpdate.date_of_birth = body.dateOfBirth;
  }

  if (Object.keys(profileUpdate).length <= 1) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("user_profile_data")
    .select("id")
    .or(`userid.eq.${id},user_id.eq.${id}`)
    .limit(1)
    .single();

  profileUpdate.user_id = id;
  profileUpdate.userid = id;

  if (existing?.id) {
    const { error: updErr } = await supabaseAdmin.from("user_profile_data").update(profileUpdate).eq("id", existing.id);
    if (updErr) {
      console.error("user_profile_data update failed:", updErr);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  } else {
    const { error: insErr } = await supabaseAdmin.from("user_profile_data").insert({
      id: crypto.randomUUID(),
      userid: id,
      user_id: id,
      ...profileUpdate,
    });
    if (insErr) {
      console.error("user_profile_data insert failed:", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: user, error: userErr } = await supabaseAdmin.from("users").select("*").eq("id", id).single();
  if (userErr || !user) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const forbid = await ensureProfileAccess(id, user as Record<string, unknown>);
  if (forbid) return forbid;

  await supabaseAdmin.from("user_profile_data").delete().or(`userid.eq.${id},user_id.eq.${id}`);

  return NextResponse.json({ success: true });
}
