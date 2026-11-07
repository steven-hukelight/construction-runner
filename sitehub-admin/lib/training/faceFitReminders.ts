import { sendPushToUsers } from "@/lib/onesignal";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { FACE_FIT_MODULE_ID, FACE_FIT_REVIEW_SOON_DAYS } from "@/lib/training/rules";
import { companyStaffIds, enabledModulesForCompany, maskLabel, trainingAudience, type FaceFitRow } from "@/lib/training/service";

type Kind = "due_soon" | "overdue";

/**
 * Daily push to the operative and their company's supervisors when a passed face fit is
 * within 30 days of review, and again once it is overdue. Only companies with Face fit
 * switched on. Deduped per user, test and kind via `notifications` rows.
 */
export async function dispatchFaceFitReminders(limit = 100): Promise<{
  scanned: number;
  notified: number;
  skipped: number;
  errors: number;
}> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const horizon = new Date(now);
  horizon.setUTCDate(horizon.getUTCDate() + FACE_FIT_REVIEW_SOON_DAYS);

  const { data: enabledRows, error: enabledError } = await supabaseAdmin
    .from("company_training_modules")
    .select("company_id")
    .eq("module_id", FACE_FIT_MODULE_ID)
    .eq("enabled", true);
  if (enabledError) {
    console.error("[face-fit-remind] settings query failed:", enabledError.message);
    return { scanned: 0, notified: 0, skipped: 0, errors: 1 };
  }
  const companies = [...new Set((enabledRows ?? []).map((r) => String(r.company_id)))];
  if (!companies.length) return { scanned: 0, notified: 0, skipped: 0, errors: 0 };

  const { data, error } = await supabaseAdmin
    .from("face_fit_tests")
    .select("*")
    .in("company_id", companies)
    .lte("review_due_at", horizon.toISOString().slice(0, 10))
    .order("tested_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("[face-fit-remind] query failed:", error.message);
    return { scanned: 0, notified: 0, skipped: 0, errors: 1 };
  }

  const candidates = (data ?? []) as FaceFitRow[];
  const userIds = [...new Set(candidates.map((r) => r.user_id))];
  const { data: newer } = userIds.length
    ? await supabaseAdmin
        .from("face_fit_tests")
        .select("id, user_id, tested_at, created_at")
        .in("user_id", userIds)
        .order("tested_at", { ascending: false })
        .order("created_at", { ascending: false })
    : { data: [] };
  const latestIdByUser = new Map<string, string>();
  for (const r of newer ?? []) {
    const uid = String(r.user_id);
    if (!latestIdByUser.has(uid)) latestIdByUser.set(uid, String(r.id));
  }

  const staffByCompany = new Map<string, string[]>();
  const audienceByCompany = new Map<string, (userId: string, moduleId: string) => boolean>();
  let notified = 0;
  let skipped = 0;
  let errors = 0;

  for (const test of candidates) {
    if (notified >= limit) break;
    if (latestIdByUser.get(test.user_id) !== test.id || test.result !== "pass") {
      skipped += 1;
      continue;
    }
    let applies = audienceByCompany.get(test.company_id);
    if (!applies) {
      applies = await trainingAudience(test.company_id, await enabledModulesForCompany(test.company_id));
      audienceByCompany.set(test.company_id, applies);
    }
    if (!applies(test.user_id, FACE_FIT_MODULE_ID)) {
      skipped += 1;
      continue;
    }
    const due = String(test.review_due_at).slice(0, 10);
    const kind: Kind = due < today ? "overdue" : "due_soon";
    const mask = maskLabel(test);

    if (!staffByCompany.has(test.company_id)) {
      staffByCompany.set(test.company_id, await companyStaffIds(test.company_id));
    }
    const staff = (staffByCompany.get(test.company_id) ?? []).filter((id) => id !== test.user_id);

    const ownTitle = kind === "overdue" ? "Face fit review overdue" : "Face fit review due soon";
    const ownBody =
      kind === "overdue"
        ? `Your face fit for ${mask} was due for review on ${due}. Ask your supervisor to book a new test.`
        : `Your face fit for ${mask} is due for review on ${due}.`;
    if (await markOnce(test, kind, test.user_id, ownTitle, ownBody)) {
      const res = await sendPushToUsers([test.user_id], ownTitle, ownBody, {
        type: "face_fit_reminder",
        screen: "training",
        test_id: test.id,
        kind,
      });
      if (res.sent) notified += 1;
      else errors += 1;
    } else {
      skipped += 1;
    }

    if (!staff.length) continue;
    const { data: person } = await supabaseAdmin.from("users").select("name, email").eq("id", test.user_id).maybeSingle();
    const name = String(person?.name ?? "").trim() || String(person?.email ?? "").trim() || "An operative";
    const staffTitle = ownTitle;
    const staffBody =
      kind === "overdue" ? `${name}'s face fit (${mask}) was due for review on ${due}.` : `${name}'s face fit (${mask}) is due for review on ${due}.`;
    const fresh: string[] = [];
    for (const uid of staff) {
      if (await markOnce(test, kind, uid, staffTitle, staffBody)) fresh.push(uid);
    }
    if (!fresh.length) continue;
    const res = await sendPushToUsers(fresh, staffTitle, staffBody, { type: "face_fit_reminder", test_id: test.id, kind });
    if (res.sent) notified += fresh.length;
    else errors += 1;
  }

  return { scanned: candidates.length, notified, skipped, errors };
}

async function markOnce(test: FaceFitRow, kind: Kind, userId: string, title: string, body: string): Promise<boolean> {
  const { data: existing } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "face_fit_reminder")
    .filter("data->>test_id", "eq", test.id)
    .filter("data->>kind", "eq", kind)
    .limit(1);
  if (existing && existing.length > 0) return false;

  const nowIso = new Date().toISOString();
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    topic: "training",
    type: "face_fit_reminder",
    title,
    body,
    data: { type: "face_fit_reminder", test_id: test.id, kind, subject_user_id: test.user_id },
    sent_at: nowIso,
    push_dispatched_at: nowIso,
  });
  if (error) {
    if ((error as { code?: string }).code === "23505") return false;
    console.warn("[face-fit-remind] marker insert failed:", error.message);
  }
  return true;
}
