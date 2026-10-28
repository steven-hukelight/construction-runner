export const ALARM_TYPES = ["fire", "medical", "lockdown", "structural"] as const;
export type AlarmType = (typeof ALARM_TYPES)[number];

export const RESPONSE_STATUSES = ["safe", "need_help", "responding"] as const;
export type AlarmResponseStatus = (typeof RESPONSE_STATUSES)[number];

export const STAND_DOWN_OUTCOMES = ["genuine", "drill", "false_alarm"] as const;
export type StandDownOutcome = (typeof STAND_DOWN_OUTCOMES)[number];

export const EMERGENCY_PLAN_BUCKET = "site-emergency-plans";
export const MAX_MUSTER_POINTS = 20;
export const MAX_INSTRUCTION_LENGTH = 2000;
export const MAX_NOTE_LENGTH = 500;

export const ALARM_LABELS: Record<AlarmType, { name: string; pushTitle: string }> = {
  fire: { name: "Fire", pushTitle: "FIRE - evacuate now" },
  medical: { name: "Medical emergency", pushTitle: "MEDICAL EMERGENCY" },
  lockdown: { name: "Security lockdown", pushTitle: "LOCKDOWN - shelter in place" },
  structural: { name: "Major incident", pushTitle: "MAJOR INCIDENT - evacuate now" },
};

export function isAlarmType(value: unknown): value is AlarmType {
  return typeof value === "string" && (ALARM_TYPES as readonly string[]).includes(value);
}

export function isResponseStatus(value: unknown): value is AlarmResponseStatus {
  return typeof value === "string" && (RESPONSE_STATUSES as readonly string[]).includes(value);
}

export function isStandDownOutcome(value: unknown): value is StandDownOutcome {
  return typeof value === "string" && (STAND_DOWN_OUTCOMES as readonly string[]).includes(value);
}

export type MusterPoint = {
  id: string;
  name: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  /** 0–1 fraction of the site plan image width / height. */
  plan_x: number | null;
  plan_y: number | null;
};

export type AlarmInstructions = Partial<Record<AlarmType, string>>;

export type AdditionalRaiser = { user_id: string; name: string; role: string | null; raised_at: string };

export type AudienceMember = {
  user_id: string;
  name: string;
  role: string | null;
  /** Signed in to the site when the alarm was raised: counted on the muster board. */
  on_site: boolean;
  staff: boolean;
};

export type SiteAlarmRow = {
  id: string;
  company_id: string;
  site_id: string;
  type: AlarmType;
  status: "active" | "stood_down";
  is_drill: boolean;
  raised_by: string | null;
  raised_by_name: string;
  raised_by_role: string | null;
  raised_at: string;
  raised_lat: number | null;
  raised_lng: number | null;
  note: string | null;
  additional_raisers: AdditionalRaiser[];
  audience_snapshot: AudienceMember[];
  stood_down_by: string | null;
  stood_down_by_name: string | null;
  stood_down_at: string | null;
  stand_down_reason: string | null;
  outcome: StandDownOutcome | null;
};

export type ResponseRow = {
  alarm_id: string;
  user_id: string;
  status: AlarmResponseStatus;
  responded_at: string;
  lat: number | null;
  lng: number | null;
};

function finiteInRange(value: unknown, min: number, max: number): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return "invalid";
  return n;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Validates muster points from the editor. Map and plan positions are both optional per point. */
export function parseMusterPoints(raw: unknown): { points: MusterPoint[] } | { error: string } {
  if (!Array.isArray(raw)) return { error: "Muster points must be a list" };
  if (raw.length > MAX_MUSTER_POINTS) return { error: `Up to ${MAX_MUSTER_POINTS} muster points` };
  const points: MusterPoint[] = [];
  const seen = new Set<string>();
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== "object") return { error: `Muster point ${index + 1} is not valid` };
    const p = item as Record<string, unknown>;
    const name = cleanText(p.name, 80);
    if (!name) return { error: `Muster point ${index + 1} needs a name` };
    const lat = finiteInRange(p.lat, -90, 90);
    const lng = finiteInRange(p.lng, -180, 180);
    const planX = finiteInRange(p.plan_x, 0, 1);
    const planY = finiteInRange(p.plan_y, 0, 1);
    if (lat === "invalid" || lng === "invalid") return { error: `${name}: map position is not valid` };
    if (planX === "invalid" || planY === "invalid") return { error: `${name}: plan position must be on the plan` };
    if ((lat === null) !== (lng === null)) return { error: `${name}: map position needs both latitude and longitude` };
    if ((planX === null) !== (planY === null)) return { error: `${name}: plan position is incomplete` };
    let id = cleanText(p.id, 64) ?? "";
    if (!/^[A-Za-z0-9_-]+$/.test(id) || seen.has(id)) id = `mp_${index}_${Date.now().toString(36)}`;
    seen.add(id);
    points.push({
      id,
      name,
      description: cleanText(p.description, 300),
      lat,
      lng,
      plan_x: planX,
      plan_y: planY,
    });
  }
  return { points };
}

export function parseInstructions(raw: unknown): { instructions: AlarmInstructions } | { error: string } {
  if (raw === null || raw === undefined) return { instructions: {} };
  if (typeof raw !== "object" || Array.isArray(raw)) return { error: "Instructions must be text per alarm type" };
  const instructions: AlarmInstructions = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isAlarmType(key)) continue;
    if (value !== null && typeof value !== "string") return { error: `${ALARM_LABELS[key].name} instructions must be text` };
    const text = cleanText(value, MAX_INSTRUCTION_LENGTH);
    if (text) instructions[key] = text;
  }
  return { instructions };
}

export function roleLabel(role: string | null | undefined): string {
  switch ((role ?? "").toLowerCase()) {
    case "admin":
      return "Admin";
    case "site_admin":
      return "Site admin";
    case "supervisor":
      return "Supervisor";
    case "superuser":
      return "Construction Runner";
    case "sub_admin":
      return "Subcontractor admin";
    case "operative":
      return "Operative";
    default:
      return "";
  }
}

export function londonClock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function alarmPushContent(
  alarm: Pick<SiteAlarmRow, "type" | "is_drill" | "raised_by_name" | "raised_at">,
  siteName: string,
): { title: string; body: string } {
  const label = ALARM_LABELS[alarm.type];
  return {
    title: alarm.is_drill ? `DRILL: ${label.pushTitle}` : label.pushTitle,
    body: `Raised by ${alarm.raised_by_name} at ${siteName}, ${londonClock(alarm.raised_at)}`,
  };
}

export function allClearPushContent(
  alarm: Pick<SiteAlarmRow, "type" | "is_drill" | "stood_down_by_name" | "stood_down_at">,
  siteName: string,
): { title: string; body: string } {
  const what = alarm.is_drill ? "Drill" : ALARM_LABELS[alarm.type].name;
  const at = alarm.stood_down_at ? `, ${londonClock(alarm.stood_down_at)}` : "";
  return {
    title: `All clear - ${siteName}`,
    body: `${what} alarm stood down by ${alarm.stood_down_by_name ?? "a supervisor"}${at}`,
  };
}

export type MusterBoard = {
  unaccounted: AudienceMember[];
  needHelp: (AudienceMember & { responded_at: string })[];
  responding: (AudienceMember & { responded_at: string })[];
  safe: (AudienceMember & { responded_at: string })[];
};

/**
 * Groups the people signed in when the alarm went off, plus anyone else who responded.
 * Off-site staff who have not responded are not "unaccounted".
 */
export function buildMusterBoard(
  snapshot: AudienceMember[],
  responses: ResponseRow[],
  names: Map<string, { name: string; role: string | null }>,
): MusterBoard {
  const byUser = new Map(responses.map((r) => [r.user_id, r]));
  const members = new Map(snapshot.map((m) => [m.user_id, m]));
  for (const r of responses) {
    if (!members.has(r.user_id)) {
      const known = names.get(r.user_id);
      members.set(r.user_id, {
        user_id: r.user_id,
        name: known?.name ?? "Unknown",
        role: known?.role ?? null,
        on_site: false,
        staff: false,
      });
    }
  }
  const board: MusterBoard = { unaccounted: [], needHelp: [], responding: [], safe: [] };
  for (const member of members.values()) {
    const response = byUser.get(member.user_id);
    if (!response) {
      if (member.on_site) board.unaccounted.push(member);
      continue;
    }
    const entry = { ...member, responded_at: response.responded_at };
    if (response.status === "need_help") board.needHelp.push(entry);
    else if (response.status === "responding") board.responding.push(entry);
    else board.safe.push(entry);
  }
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  board.unaccounted.sort(byName);
  board.needHelp.sort(byName);
  board.responding.sort(byName);
  board.safe.sort(byName);
  return board;
}
