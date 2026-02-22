import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkPreInductionAccess } from "../_utils/auth";
import { updatePreInductionStatus } from "../_utils/status";

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const access = await checkPreInductionAccess(userId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }

    const body = await req.json();
    const fullName = body.fullName ?? "";
    const extraData: Record<string, unknown> = {
      employerCompanyId: body.employerCompanyId ?? "",
      supervisorName: body.supervisorName ?? "",
      trade: body.trade ?? "",
      jobRole: body.jobRole ?? "",
      payrollNumber: body.payrollNumber ?? "",
    };
    const payload = {
      full_name: fullName,
      date_of_birth: body.dateOfBirth ?? null,
      phone: body.phone ?? "",
      email: body.email ?? "",
      address: body.address ?? "",
      emergency_contact_name: body.emergencyContactName ?? "",
      emergency_contact_relationship: body.emergencyContactRelationship ?? "",
      emergency_contact_phone: body.emergencyContactPhone ?? "",
      national_insurance: body.nationalInsuranceNumber ?? body.nationalInsurance ?? "",
      utr: body.utrNumber ?? body.utr ?? "",
      data: extraData,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseAdmin
      .from("pre_induction_personal")
      .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
    if (upsertError) {
      console.error("pre_induction_personal upsert failed:", upsertError);
      return NextResponse.json(
        { error: `Failed to save personal details: ${upsertError.message}. Ensure migration 20250220000005_pre_induction_tables.sql has been applied.` },
        { status: 500 }
      );
    }

    // Sync name and phone to users table for display in tables/lists (linked data)
    if (fullName || payload.phone) {
      const userUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (fullName) userUpdate.display_name = fullName;
      if (payload.phone) userUpdate.phone = payload.phone;
      const { error: userErr } = await supabaseAdmin.from("users").update(userUpdate).eq("id", userId);
      if (userErr) console.warn("users sync failed:", userErr);
    }
    // Sync to profiles (Personal Info) so they share the same data
    try {
      const { data: existing, error: profFetchErr } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (profFetchErr) {
        console.warn("profiles select (sync skipped):", profFetchErr.message, "- profiles table may not exist");
      } else {
        const profileUpdate = {
          emergency_contact_name: payload.emergency_contact_name,
          emergency_contact_phone: payload.emergency_contact_phone,
          ni_number: payload.national_insurance,
          utr_number: payload.utr,
          date_of_birth: payload.date_of_birth ?? null,
          address_line1: payload.address ?? null,
          job_title: body.jobRole ?? body.jobTitle ?? null,
          updated_at: new Date().toISOString(),
        };
        if (existing?.id) {
          const { error: profUpdErr } = await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", existing.id);
          if (profUpdErr) console.warn("profiles update:", profUpdErr.message);
        } else {
          const { error: profInsErr } = await supabaseAdmin.from("profiles").insert({
            id: crypto.randomUUID(),
            user_id: userId,
            ...profileUpdate,
          });
          if (profInsErr) console.warn("profiles insert:", profInsErr.message);
        }
      }
    } catch (syncErr) {
      console.warn("pre_induction_personal->profiles sync:", syncErr);
    }
    await updatePreInductionStatus(userId);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST pre-induction personal:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
