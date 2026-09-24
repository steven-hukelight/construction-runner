import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import {
  computeNextInspectionDue,
  parseIntervalDays,
} from "@/lib/assets/inspectionSchedule";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value?.trim();

    if (role === "operative") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || "";
    }

    const { data, error } = await supabaseAdmin
      .from("assets")
      .select(
        "id, name, type, status, description, site_id, company_id, created_at, serial_number, inspection_interval_days, last_inspected_at, next_inspection_due, inspection_reminder_days_before, inspection_required",
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (companyId && data.company_id !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET /api/assets/[id]:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value?.trim();

    if (role === "operative") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || "";
    }

    const { data, error } = await supabaseAdmin
      .from("assets")
      .select("id, company_id")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (companyId && data.company_id !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: delError } = await supabaseAdmin.from("assets").delete().eq("id", id);
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/assets/[id]:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value?.trim();

    if (role === "operative") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || "";
    }

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.type !== undefined) updates.type = body.type;
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.site_id !== undefined) updates.site_id = body.site_id;
    if (body.serial_number !== undefined) updates.serial_number = body.serial_number;

    const intervalProvided =
      body.inspection_interval_days !== undefined ||
      body.inspectionIntervalDays !== undefined;
    if (intervalProvided) {
      const intervalDays = parseIntervalDays(
        body.inspection_interval_days ?? body.inspectionIntervalDays,
      );
      updates.inspection_interval_days = intervalDays;
      if (intervalDays == null) {
        updates.next_inspection_due = null;
      } else if (
        body.next_inspection_due === undefined &&
        body.nextInspectionDue === undefined
      ) {
        const { data: cur } = await supabaseAdmin
          .from("assets")
          .select("last_inspected_at, next_inspection_due")
          .eq("id", id)
          .maybeSingle();
        const last = (cur as { last_inspected_at?: string | null } | null)?.last_inspected_at;
        const from = last ? new Date(last) : new Date();
        updates.next_inspection_due = computeNextInspectionDue({
          intervalDays,
          from: Number.isNaN(from.getTime()) ? new Date() : from,
        });
      }
    }

    if (body.next_inspection_due !== undefined || body.nextInspectionDue !== undefined) {
      const raw = body.next_inspection_due ?? body.nextInspectionDue;
      updates.next_inspection_due =
        raw == null || String(raw).trim() === "" ? null : String(raw).trim().slice(0, 10);
    }
    if (body.inspection_required !== undefined || body.inspectionRequired !== undefined) {
      updates.inspection_required = Boolean(
        body.inspection_required ?? body.inspectionRequired,
      );
    }
    if (
      body.inspection_reminder_days_before !== undefined ||
      body.inspectionReminderDaysBefore !== undefined
    ) {
      const remind = parseIntervalDays(
        body.inspection_reminder_days_before ?? body.inspectionReminderDaysBefore,
      );
      if (remind != null) updates.inspection_reminder_days_before = remind;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates" }, { status: 400 });
    }

    let query = supabaseAdmin.from("assets").update(updates).eq("id", id);
    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { error } = await query.select("id").single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/assets/[id]:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
