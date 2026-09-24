import {
  assetInspectionDueStatus,
  toDateOnlyUtc,
} from "@/lib/assets/inspectionSchedule";
import { sendPushToUsers } from "@/lib/onesignal";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type AssetRow = {
  id: string;
  name: string;
  company_id: string;
  next_inspection_due: string;
  inspection_reminder_days_before: number | null;
  inspection_required: boolean | null;
};

/**
 * Daily (or on-demand) push for assets whose inspection is due soon or overdue.
 * Deduped per user + asset + due date + kind via `notifications` rows.
 */
export async function dispatchAssetInspectionReminders(limit = 80): Promise<{
  scanned: number;
  notified: number;
  skipped: number;
  errors: number;
}> {
  const today = toDateOnlyUtc(new Date());
  // Look ahead enough for the longest common reminder window (30d) without
  // dumping the whole table; overdue rows are included via LTE today.
  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + 30);
  const horizonStr = toDateOnlyUtc(horizon);

  const { data: assets, error } = await supabaseAdmin
    .from("assets")
    .select(
      "id, name, company_id, next_inspection_due, inspection_reminder_days_before, inspection_required",
    )
    .eq("inspection_required", true)
    .not("next_inspection_due", "is", null)
    .lte("next_inspection_due", horizonStr)
    .limit(Math.max(limit * 3, 120));

  if (error) {
    console.error("[asset-insp-remind] query failed:", error.message);
    return { scanned: 0, notified: 0, skipped: 0, errors: 1 };
  }

  const rows = (assets ?? []) as AssetRow[];
    let notified = 0;
  let skipped = 0;
  let errors = 0;

  for (const asset of rows) {
    if (notified >= limit) break;

    const status = assetInspectionDueStatus({
      nextDue: asset.next_inspection_due,
      reminderDaysBefore: asset.inspection_reminder_days_before,
      inspectionRequired: asset.inspection_required,
    });
    if (status !== "due_soon" && status !== "overdue") {
      skipped += 1;
      continue;
    }

    const kind = status;
    const due = String(asset.next_inspection_due).slice(0, 10);
    const title =
      kind === "overdue" ? "Inspection overdue" : "Inspection due soon";
    const body =
      kind === "overdue"
        ? `${asset.name} was due for inspection on ${due}.`
        : `${asset.name} is due for inspection on ${due}.`;

    const recipientIds = await resolveReminderRecipients(asset);
    if (recipientIds.length === 0) {
      skipped += 1;
      continue;
    }

    for (const uid of recipientIds) {
      if (notified >= limit) break;
      const dedupeOk = await tryInsertReminderMarker({
        userId: uid,
        assetId: asset.id,
        dueDate: due,
        kind,
        title,
        body,
      });
      if (!dedupeOk) {
        skipped += 1;
        continue;
      }

      const res = await sendPushToUsers([uid], title, body, {
        type: "asset_inspection_reminder",
        screen: "assets",
        asset_id: asset.id,
        due_date: due,
        kind,
      });
      if (!res.sent) {
        errors += 1;
        console.warn("[asset-insp-remind] push failed", {
          userId: uid,
          assetId: asset.id,
          error: res.error,
        });
      } else {
        notified += 1;
      }
    }
  }

  return {
    scanned: rows.length,
    notified,
    skipped,
    errors,
  };
}

async function resolveReminderRecipients(asset: AssetRow): Promise<string[]> {
  const ids = new Set<string>();

  const { data: assigns } = await supabaseAdmin
    .from("asset_assignments")
    .select("user_id")
    .eq("asset_id", asset.id);
  for (const a of assigns ?? []) {
    const uid = (a as { user_id?: string }).user_id;
    if (uid) ids.add(uid);
  }

  const { data: staff } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("company_id", asset.company_id)
    .in("role", ["admin", "supervisor", "sub_admin", "superuser"]);
  for (const u of staff ?? []) {
    const uid = (u as { id?: string }).id;
    if (uid) ids.add(uid);
  }

  return [...ids];
}

async function tryInsertReminderMarker(opts: {
  userId: string;
  assetId: string;
  dueDate: string;
  kind: string;
  title: string;
  body: string;
}): Promise<boolean> {
  // Soft dedupe: skip if we already sent for this user/asset/due/kind.
  const { data: existing } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("user_id", opts.userId)
    .eq("type", "asset_inspection_reminder")
    .filter("data->>asset_id", "eq", opts.assetId)
    .filter("data->>due_date", "eq", opts.dueDate)
    .filter("data->>kind", "eq", opts.kind)
    .limit(1);

  if (existing && existing.length > 0) return false;

  const nowIso = new Date().toISOString();
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: opts.userId,
    topic: "assets",
    type: "asset_inspection_reminder",
    title: opts.title,
    body: opts.body,
    data: {
      type: "asset_inspection_reminder",
      asset_id: opts.assetId,
      due_date: opts.dueDate,
      kind: opts.kind,
    },
    sent_at: nowIso,
    push_dispatched_at: nowIso,
  });

  if (error) {
    // Unique / race — treat as already sent.
    if ((error as { code?: string }).code === "23505") return false;
    console.warn("[asset-insp-remind] marker insert failed:", error.message);
    // Still allow push so a DB blip doesn't drop the reminder.
    return true;
  }
  return true;
}
