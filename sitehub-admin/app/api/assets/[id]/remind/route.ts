import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { sendPushToUsers } from "@/lib/onesignal";
import { assetInspectionDueStatus, toDateOnlyUtc } from "@/lib/assets/inspectionSchedule";

/**
 * POST /api/assets/[id]/remind — admin push reminder when due within 48h or overdue.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value?.trim() || "";

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

    const { data: asset, error } = await supabaseAdmin
      .from("assets")
      .select(
        "id, name, company_id, next_inspection_due, inspection_reminder_days_before, inspection_required",
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (companyId && asset.company_id !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const due = (asset.next_inspection_due ?? "").toString().slice(0, 10);
    if (!due) {
      return NextResponse.json(
        { error: "No inspection due date set on this asset" },
        { status: 400 },
      );
    }

    const today = toDateOnlyUtc(new Date());
    const todayMs = Date.parse(`${today}T00:00:00.000Z`);
    const dueMs = Date.parse(`${due}T00:00:00.000Z`);
    if (!Number.isFinite(todayMs) || !Number.isFinite(dueMs)) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }
    const daysUntil = Math.round((dueMs - todayMs) / 86_400_000);
    const status = assetInspectionDueStatus({
      nextDue: due,
      reminderDaysBefore: asset.inspection_reminder_days_before,
      inspectionRequired: asset.inspection_required,
    });

    // Allow manual remind when overdue, due soon, or within the next 48 hours.
    const within48h = daysUntil >= 0 && daysUntil <= 2;
    if (status !== "overdue" && status !== "due_soon" && !within48h) {
      return NextResponse.json(
        {
          error:
            "Reminders can only be sent when the inspection is overdue or due within 48 hours",
          daysUntil,
          status,
        },
        { status: 400 },
      );
    }

    const kind = status === "overdue" || daysUntil < 0 ? "overdue" : "due_soon";
    const title =
      kind === "overdue" ? "Inspection overdue" : "Inspection due soon";
    const body =
      kind === "overdue"
        ? `${asset.name} was due for inspection on ${due}.`
        : `${asset.name} is due for inspection on ${due}.`;

    const recipientIds = new Set<string>();
    const { data: assigns } = await supabaseAdmin
      .from("asset_assignments")
      .select("user_id")
      .eq("asset_id", id);
    for (const a of assigns ?? []) {
      if ((a as { user_id?: string }).user_id) {
        recipientIds.add(String((a as { user_id: string }).user_id));
      }
    }
    const { data: staff } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("company_id", asset.company_id)
      .in("role", ["admin", "supervisor", "sub_admin", "site_admin", "superuser"]);
    for (const u of staff ?? []) {
      if ((u as { id?: string }).id) recipientIds.add(String((u as { id: string }).id));
    }

    const ids = [...recipientIds];
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No assignees or admins to notify" },
        { status: 400 },
      );
    }

    const push = await sendPushToUsers(ids, title, body, {
      type: "asset_inspection_reminder",
      screen: "assets",
      asset_id: id,
      due_date: due,
      kind,
    });

    return NextResponse.json({
      success: Boolean(push.sent),
      recipients: ids.length,
      kind,
      due,
      error: push.error,
    });
  } catch (e) {
    console.error("POST /api/assets/[id]/remind:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
