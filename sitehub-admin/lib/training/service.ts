import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendPushToUsers } from "@/lib/onesignal";
import { userIdsForSiteContent } from "@/lib/auth/siteAudience";
import {
  FACE_FIT_MODULE_ID,
  FAILS_BEFORE_SUPERVISOR_NOTE,
  campaignIsLive,
  faceFitStatus,
  failsInARow,
  isPlayable,
  moduleStatus,
  needsAction,
  type FaceFitStatus,
  type QuizQuestion,
  type TrainingStatus,
} from "@/lib/training/rules";

export const TRAINING_VIDEO_BUCKET = "training-videos";
export const TRAINING_DOCUMENT_BUCKET = "training-documents";
export const FACE_FIT_BUCKET = "face-fit-certificates";
const VIDEO_URL_TTL_SECONDS = 2 * 60 * 60;

export type TrainingModuleRow = {
  id: string;
  kind: "video" | "record";
  title: string;
  summary: string;
  minutes: number | null;
  sort_order: number;
  video_path: string | null;
  /** Only set when a company has given the module a PDF instead of a video. Not a catalogue column. */
  document_path?: string | null;
  external_url: string | null;
  external_publisher: string | null;
  external_acknowledgement: string | null;
  min_watch_seconds: number | null;
  pass_mark: number;
  active: boolean;
};

export type CompanyModuleRow = {
  company_id: string;
  module_id: string;
  enabled: boolean;
  refresh_months: number | null;
  /** The company's own video or PDF (never both); replaces the default for its people. */
  video_path: string | null;
  video_name: string | null;
  document_path: string | null;
  document_name: string | null;
  /** `sites`: only people linked to the sites in company_training_module_sites. */
  scope: "company" | "sites";
};

export type ViewRow = {
  id: string;
  user_id: string;
  module_id: string;
  source: "bucket" | "external" | "document";
  started_at: string;
  completed_at: string | null;
};

export type AttemptRow = {
  id: string;
  user_id: string;
  module_id: string;
  view_id: string | null;
  score: number;
  total: number;
  passed: boolean;
  submitted_at: string;
};

export type FaceFitRow = {
  id: string;
  company_id: string;
  user_id: string;
  tested_at: string;
  review_due_at: string;
  result: "pass" | "fail";
  method: "qualitative" | "quantitative";
  mask_make: string;
  mask_model: string;
  mask_size: string | null;
  tester_name: string;
  certificate_path: string | null;
  notes: string | null;
  created_at: string;
};

export type CampaignRow = {
  id: string;
  company_id: string;
  title: string;
  summary: string | null;
  url: string;
  publisher: string | null;
  starts_on: string;
  ends_on: string;
  created_at: string;
};

export const COMPANY_MODULE_COLUMNS =
  "company_id, module_id, enabled, refresh_months, video_path, video_name, document_path, document_name, scope";

const MODULE_COLUMNS =
  "id, kind, title, summary, minutes, sort_order, video_path, external_url, external_publisher, external_acknowledgement, min_watch_seconds, pass_mark, active";

export async function loadCatalogue(): Promise<TrainingModuleRow[]> {
  const { data, error } = await supabaseAdmin
    .from("training_modules")
    .select(MODULE_COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`training_modules: ${error.message}`);
  return (data ?? []) as TrainingModuleRow[];
}

export async function loadModule(moduleId: string): Promise<TrainingModuleRow | null> {
  const { data, error } = await supabaseAdmin
    .from("training_modules")
    .select(MODULE_COLUMNS)
    .eq("id", moduleId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(`training_modules: ${error.message}`);
  return (data as TrainingModuleRow | null) ?? null;
}

export async function loadCompanySettings(companyId: string): Promise<Map<string, CompanyModuleRow>> {
  const { data, error } = await supabaseAdmin
    .from("company_training_modules")
    .select(COMPANY_MODULE_COLUMNS)
    .eq("company_id", companyId);
  if (error) throw new Error(`company_training_modules: ${error.message}`);
  return new Map(((data ?? []) as CompanyModuleRow[]).map((r) => [r.module_id, r]));
}

/** The module as this company's people see it: the company's own video or PDF wins over the default. */
export function withCompanyMaterial(module: TrainingModuleRow, setting: CompanyModuleRow | undefined | null): TrainingModuleRow {
  if (module.kind !== "video") return module;
  if (setting?.video_path) return { ...module, video_path: setting.video_path, document_path: null };
  if (setting?.document_path) return { ...module, video_path: null, external_url: null, document_path: setting.document_path };
  return module;
}

/** Chosen sites for each site-based module in the company. */
export async function loadModuleSites(companyId: string): Promise<Map<string, string[]>> {
  const { data, error } = await supabaseAdmin
    .from("company_training_module_sites")
    .select("module_id, site_id")
    .eq("company_id", companyId);
  if (error) throw new Error(`company_training_module_sites: ${error.message}`);
  const out = new Map<string, string[]>();
  for (const row of data ?? []) {
    const id = String(row.module_id);
    out.set(id, [...(out.get(id) ?? []), String(row.site_id)]);
  }
  return out;
}

export type EnabledModule = {
  module: TrainingModuleRow;
  refreshMonths: number | null;
  /** Null for a whole-company module; otherwise the chosen sites. */
  siteIds: string[] | null;
};

/** Modules switched on for the company that a person can actually take, whoever they apply to. */
export async function enabledModulesForCompany(companyId: string): Promise<EnabledModule[]> {
  const [catalogue, settings, moduleSites] = await Promise.all([
    loadCatalogue(),
    loadCompanySettings(companyId),
    loadModuleSites(companyId),
  ]);
  return catalogue
    .filter((m) => settings.get(m.id)?.enabled === true)
    .map((m) => withCompanyMaterial(m, settings.get(m.id)))
    .filter((m) => m.kind === "record" || isPlayable(m))
    .map((m) => {
      const setting = settings.get(m.id);
      return {
        module: m,
        refreshMonths: setting?.refresh_months ?? null,
        siteIds: setting?.scope === "sites" ? moduleSites.get(m.id) ?? [] : null,
      };
    });
}

/** Answers "does this module apply to this person?" for a set of enabled modules. */
export async function trainingAudience(
  companyId: string,
  enabled: EnabledModule[],
): Promise<(userId: string, moduleId: string) => boolean> {
  const siteIds = [...new Set(enabled.flatMap((e) => e.siteIds ?? []))];
  const people = new Map<string, Set<string>>();
  await Promise.all(
    siteIds.map(async (siteId) => {
      people.set(siteId, new Set(await userIdsForSiteContent(companyId, siteId)));
    }),
  );
  const byModule = new Map(enabled.map((e) => [e.module.id, e.siteIds]));
  return (userId, moduleId) => {
    const sites = byModule.get(moduleId);
    if (sites === undefined) return false;
    if (sites === null) return true;
    return sites.some((siteId) => people.get(siteId)?.has(userId) === true);
  };
}

/** Enabled modules that apply to this person: whole-company ones plus those for their sites. */
export async function enabledModulesForUser(userId: string, companyId: string): Promise<EnabledModule[]> {
  const enabled = await enabledModulesForCompany(companyId);
  if (enabled.every((e) => e.siteIds === null)) return enabled;
  const applies = await trainingAudience(companyId, enabled);
  return enabled.filter((e) => applies(userId, e.module.id));
}

export async function loadQuestions(moduleId: string): Promise<QuizQuestion[]> {
  const { data, error } = await supabaseAdmin
    .from("training_questions")
    .select("id, stem, options, correct_index, sort_order")
    .eq("module_id", moduleId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`training_questions: ${error.message}`);
  return (data ?? []).map((q) => ({
    id: String(q.id),
    stem: String(q.stem),
    options: Array.isArray(q.options) ? q.options.map(String) : [],
    correct_index: Number(q.correct_index),
  }));
}

async function loadActivity(userIds: string[], moduleIds: string[]) {
  if (!userIds.length || !moduleIds.length) return { views: [] as ViewRow[], attempts: [] as AttemptRow[] };
  const [views, attempts] = await Promise.all([
    supabaseAdmin
      .from("training_video_views")
      .select("id, user_id, module_id, source, started_at, completed_at")
      .in("user_id", userIds)
      .in("module_id", moduleIds)
      .order("started_at", { ascending: false })
      .limit(5000),
    supabaseAdmin
      .from("training_attempts")
      .select("id, user_id, module_id, view_id, score, total, passed, submitted_at")
      .in("user_id", userIds)
      .in("module_id", moduleIds)
      .order("submitted_at", { ascending: false })
      .limit(5000),
  ]);
  if (views.error) throw new Error(`training_video_views: ${views.error.message}`);
  if (attempts.error) throw new Error(`training_attempts: ${attempts.error.message}`);
  return { views: (views.data ?? []) as ViewRow[], attempts: (attempts.data ?? []) as AttemptRow[] };
}

export type ModuleProgress = {
  status: TrainingStatus;
  dueAt: string | null;
  lastPassedAt: string | null;
  lastScore: number | null;
  lastTotal: number | null;
  /** The completed view the quiz may be taken against, if any. */
  quizViewId: string | null;
  failsInARow: number;
};

export function progressFor(
  views: ViewRow[],
  attempts: AttemptRow[],
  refreshMonths: number | null,
  now: Date = new Date(),
): ModuleProgress {
  const lastPass = attempts.find((a) => a.passed) ?? null;
  const lastPassedAt = lastPass?.submitted_at ?? null;
  const since = lastPassedAt ? new Date(lastPassedAt).getTime() : -Infinity;
  const viewsSince = views.filter((v) => new Date(v.started_at).getTime() > since);
  const attemptsSince = attempts.filter((a) => new Date(a.submitted_at).getTime() > since);
  const { status, dueAt } = moduleStatus({
    lastPassedAt,
    refreshMonths,
    activitySincePass: viewsSince.length > 0 || attemptsSince.length > 0,
    now,
  });
  const completed = viewsSince.find((v) => v.completed_at);
  const latest = attempts[0] ?? null;
  return {
    status,
    dueAt,
    lastPassedAt,
    lastScore: latest?.score ?? null,
    lastTotal: latest?.total ?? null,
    quizViewId: completed?.id ?? null,
    failsInARow: failsInARow(attempts),
  };
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    out.set(k, [...(out.get(k) ?? []), row]);
  }
  return out;
}

export async function latestFaceFits(userIds: string[]): Promise<Map<string, FaceFitRow>> {
  if (!userIds.length) return new Map();
  const { data, error } = await supabaseAdmin
    .from("face_fit_tests")
    .select("*")
    .in("user_id", userIds)
    .order("tested_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(`face_fit_tests: ${error.message}`);
  const latest = new Map<string, FaceFitRow>();
  for (const row of (data ?? []) as FaceFitRow[]) {
    if (!latest.has(row.user_id)) latest.set(row.user_id, row);
  }
  return latest;
}

export type PhoneModule = {
  id: string;
  title: string;
  summary: string;
  minutes: number | null;
  publisher: string | null;
  external: boolean;
  format: "video" | "document";
} & ModuleProgress;

export type PhoneFaceFit = {
  status: FaceFitStatus;
  testedAt: string | null;
  reviewDueAt: string | null;
  result: "pass" | "fail" | null;
  mask: string | null;
};

export type PhoneCampaign = {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  publisher: string | null;
  endsOn: string;
  acknowledged: boolean;
};

export type MyTraining = {
  modules: PhoneModule[];
  faceFit: PhoneFaceFit | null;
  campaigns: PhoneCampaign[];
  dueCount: number;
};

export function maskLabel(row: Pick<FaceFitRow, "mask_make" | "mask_model" | "mask_size">): string {
  return [row.mask_make, row.mask_model, row.mask_size ? `size ${row.mask_size}` : null].filter(Boolean).join(" ");
}

export async function myTraining(userId: string, companyId: string, now: Date = new Date()): Promise<MyTraining> {
  const enabled = await enabledModulesForUser(userId, companyId);
  const videoModules = enabled.filter((e) => e.module.kind === "video");
  const faceFitOn = enabled.some((e) => e.module.id === FACE_FIT_MODULE_ID);

  const [{ views, attempts }, fits, campaigns] = await Promise.all([
    loadActivity([userId], videoModules.map((e) => e.module.id)),
    faceFitOn ? latestFaceFits([userId]) : Promise.resolve(new Map<string, FaceFitRow>()),
    liveCampaignsFor(userId, companyId, now),
  ]);
  const viewsByModule = groupBy(views, (v) => v.module_id);
  const attemptsByModule = groupBy(attempts, (a) => a.module_id);

  const modules: PhoneModule[] = videoModules.map(({ module, refreshMonths }) => ({
    id: module.id,
    title: module.title,
    summary: module.summary,
    minutes: module.minutes,
    publisher: module.video_path || module.document_path ? null : module.external_publisher,
    external: !module.video_path && !module.document_path && Boolean(module.external_url),
    format: module.document_path ? "document" : "video",
    ...progressFor(viewsByModule.get(module.id) ?? [], attemptsByModule.get(module.id) ?? [], refreshMonths, now),
  }));

  let faceFit: PhoneFaceFit | null = null;
  if (faceFitOn) {
    const latest = fits.get(userId) ?? null;
    faceFit = {
      status: faceFitStatus(latest, now),
      testedAt: latest?.tested_at ?? null,
      reviewDueAt: latest?.review_due_at ?? null,
      result: latest?.result ?? null,
      mask: latest ? maskLabel(latest) : null,
    };
  }

  const dueCount =
    modules.filter((m) => needsAction(m.status)).length +
    (faceFit && faceFit.status !== "current" ? 1 : 0) +
    campaigns.filter((c) => !c.acknowledged).length;

  return { modules, faceFit, campaigns, dueCount };
}

async function liveCampaignsFor(userId: string, companyId: string, now: Date): Promise<PhoneCampaign[]> {
  const today = now.toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from("training_campaigns")
    .select("id, company_id, title, summary, url, publisher, starts_on, ends_on, created_at")
    .eq("company_id", companyId)
    .lte("starts_on", today)
    .gte("ends_on", today)
    .order("ends_on", { ascending: true });
  if (error) throw new Error(`training_campaigns: ${error.message}`);
  const live = ((data ?? []) as CampaignRow[]).filter((c) => campaignIsLive(c, now));
  if (!live.length) return [];
  const { data: acks } = await supabaseAdmin
    .from("training_campaign_acks")
    .select("campaign_id")
    .eq("user_id", userId)
    .in("campaign_id", live.map((c) => c.id));
  const acked = new Set((acks ?? []).map((a) => String(a.campaign_id)));
  return live.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    url: c.url,
    publisher: c.publisher,
    endsOn: c.ends_on,
    acknowledged: acked.has(c.id),
  }));
}

/** The module must be switched on for the company, apply to this person, and be playable. */
export async function moduleForUser(
  moduleId: string,
  userId: string,
  companyId: string,
): Promise<EnabledModule | null> {
  const enabled = await enabledModulesForUser(userId, companyId);
  const found = enabled.find((e) => e.module.id === moduleId && e.module.kind === "video");
  return found ?? null;
}

export async function signedVideoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage.from(TRAINING_VIDEO_BUCKET).createSignedUrl(path, VIDEO_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error("training video signed URL failed:", error);
    return null;
  }
  return data.signedUrl;
}

export async function signedDocumentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage.from(TRAINING_DOCUMENT_BUCKET).createSignedUrl(path, VIDEO_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error("training document signed URL failed:", error);
    return null;
  }
  return data.signedUrl;
}

export async function userProgress(userId: string, moduleId: string, refreshMonths: number | null): Promise<ModuleProgress> {
  const { views, attempts } = await loadActivity([userId], [moduleId]);
  return progressFor(views, attempts, refreshMonths);
}

/** Company people the training applies to. Platform superusers are not company staff. */
export async function companyPeople(companyId: string): Promise<{ id: string; name: string; role: string }[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role")
    .eq("company_id", companyId)
    .neq("role", "superuser")
    .order("name", { ascending: true })
    .limit(2000);
  if (error) throw new Error(`users: ${error.message}`);
  return (data ?? []).map((u) => ({
    id: String(u.id),
    name: String(u.name ?? "").trim() || String(u.email ?? "").trim() || "Unnamed",
    role: String(u.role ?? ""),
  }));
}

export type PeopleMatrix = {
  modules: { id: string; title: string; refreshMonths: number | null }[];
  people: {
    id: string;
    name: string;
    role: string;
    modules: Record<string, { status: TrainingStatus; dueAt: string | null; lastPassedAt: string | null; lastScore: number | null }>;
    faceFit: { status: FaceFitStatus; reviewDueAt: string | null; mask: string | null } | null;
  }[];
};

export async function peopleMatrix(companyId: string, now: Date = new Date()): Promise<PeopleMatrix> {
  const [enabled, people] = await Promise.all([enabledModulesForCompany(companyId), companyPeople(companyId)]);
  const videoModules = enabled.filter((e) => e.module.kind === "video");
  const faceFitOn = enabled.some((e) => e.module.id === FACE_FIT_MODULE_ID);
  const ids = people.map((p) => p.id);
  const [{ views, attempts }, fits] = await Promise.all([
    loadActivity(ids, videoModules.map((e) => e.module.id)),
    faceFitOn ? latestFaceFits(ids) : Promise.resolve(new Map<string, FaceFitRow>()),
  ]);
  const viewsBy = groupBy(views, (v) => `${v.user_id}:${v.module_id}`);
  const attemptsBy = groupBy(attempts, (a) => `${a.user_id}:${a.module_id}`);
  const applies = await trainingAudience(companyId, enabled);

  return {
    modules: videoModules.map((e) => ({ id: e.module.id, title: e.module.title, refreshMonths: e.refreshMonths })),
    people: people.map((p) => {
      const modules: PeopleMatrix["people"][number]["modules"] = {};
      for (const { module, refreshMonths } of videoModules) {
        if (!applies(p.id, module.id)) continue;
        const key = `${p.id}:${module.id}`;
        const prog = progressFor(viewsBy.get(key) ?? [], attemptsBy.get(key) ?? [], refreshMonths, now);
        modules[module.id] = {
          status: prog.status,
          dueAt: prog.dueAt,
          lastPassedAt: prog.lastPassedAt,
          lastScore: prog.lastScore,
        };
      }
      const fit = fits.get(p.id) ?? null;
      return {
        ...p,
        modules,
        faceFit: faceFitOn && applies(p.id, FACE_FIT_MODULE_ID)
          ? { status: faceFitStatus(fit, now), reviewDueAt: fit?.review_due_at ?? null, mask: fit ? maskLabel(fit) : null }
          : null,
      };
    }),
  };
}

/** Admins and supervisors in the company. */
export async function companyStaffIds(companyId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("company_id", companyId)
    .in("role", ["admin", "site_admin", "supervisor"]);
  return (data ?? []).map((u) => String(u.id)).filter(Boolean);
}

/** Sent once, on the third fail in a row. The operative can still retry. */
export async function noteRepeatedFails(opts: {
  companyId: string;
  userId: string;
  moduleId: string;
  moduleTitle: string;
  fails: number;
}): Promise<void> {
  if (opts.fails !== FAILS_BEFORE_SUPERVISOR_NOTE) return;
  const staff = (await companyStaffIds(opts.companyId)).filter((id) => id !== opts.userId);
  if (!staff.length) return;
  const { data: person } = await supabaseAdmin.from("users").select("name, email").eq("id", opts.userId).maybeSingle();
  const name = String(person?.name ?? "").trim() || String(person?.email ?? "").trim() || "An operative";
  const title = "Training quiz failed three times";
  const body = `${name} has failed the ${opts.moduleTitle} quiz three times in a row.`;
  const nowIso = new Date().toISOString();
  const data = { type: "training_repeated_fail", module_id: opts.moduleId, user_id: opts.userId };
  const { error } = await supabaseAdmin.from("notifications").insert(
    staff.map((uid) => ({
      user_id: uid,
      topic: "training",
      type: "training_repeated_fail",
      title,
      body,
      data,
      sent_at: nowIso,
      push_dispatched_at: nowIso,
    })),
  );
  if (error) console.warn("[training] repeated-fail notification insert failed:", error.message);
  const res = await sendPushToUsers(staff, title, body, data);
  if (!res.sent) console.warn("[training] repeated-fail push failed:", res.error);
}
