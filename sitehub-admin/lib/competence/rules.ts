/** Card types a worker can hold on their competency card. Same list as the phone and the pre-induction form. */
export const CARD_TYPES = ["CSCS", "CPCS", "ECITB", "ECSC", "Gas Safe", "JIB", "CITB", "Other"] as const;

/** CSCS card colours. Red and White are separate routes, so they only satisfy themselves. */
export const CSCS_LEVELS = [
  { id: "Green", label: "Green (Labourer)" },
  { id: "Blue", label: "Blue (Skilled worker)" },
  { id: "Gold", label: "Gold (Advanced craft or supervisor)" },
  { id: "Black", label: "Black (Manager)" },
  { id: "Red", label: "Red (Trainee, apprentice or provisional)" },
  { id: "White", label: "White (Professionally or academically qualified)" },
] as const;

const CSCS_LADDER = ["Green", "Blue", "Gold", "Black"];

/** Tickets recorded in the worker's certifications. Codes match the pre-induction certification types. */
export const TICKET_TYPES = [
  { code: "IPAF", label: "IPAF" },
  { code: "PASMA", label: "PASMA" },
  { code: "SMSTS", label: "SMSTS" },
  { code: "SSSTS", label: "SSSTS" },
  { code: "FIRST_AID", label: "First aid" },
  { code: "MANUAL_HANDLING", label: "Manual handling" },
  { code: "ASBESTOS", label: "Asbestos awareness" },
  { code: "FIRE_MARSHAL", label: "Fire marshal" },
  { code: "CONFINED_SPACES", label: "Confined spaces" },
] as const;

export const EXPIRY_REMINDER_DAYS = [60, 30, 7] as const;
/** A lapse older than this is not announced, so a first run doesn't flood supervisors with old cards. */
export const LAPSE_NOTICE_WINDOW_DAYS = 14;

export type RequirementKind = "card" | "ticket";

export type Requirement = {
  kind: RequirementKind;
  code: string;
  level?: string | null;
};

export type HeldCard = {
  type: string | null;
  level: string | null;
  number: string | null;
  expiry: string | null;
  checkedAt: string | null;
};

export type HeldTicket = {
  code: string;
  label: string;
  expiry: string | null;
};

export type Holdings = {
  card: HeldCard | null;
  tickets: HeldTicket[];
};

export type RequirementCheck =
  | { ok: true; unchecked: boolean }
  | { ok: false; reason: "missing" | "expired" | "wrong_card" | "level_too_low"; detail: string };

export function normaliseCode(value: string): string {
  return value.trim().replace(/[\s_-]+/g, " ").toUpperCase();
}

export function ticketLabel(code: string): string {
  const known = TICKET_TYPES.find((t) => normaliseCode(t.code) === normaliseCode(code));
  return known ? known.label : code.trim();
}

export function requirementLabel(req: Requirement): string {
  if (req.kind === "card") {
    return req.level ? `${req.code} ${req.level}` : `${req.code} card`;
  }
  return ticketLabel(req.code);
}

/** Validates one requirement from a request body. Returns null when it is not usable. */
export function parseRequirement(value: unknown): Requirement | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const kind = v.kind === "card" || v.kind === "ticket" ? v.kind : null;
  const code = typeof v.code === "string" ? v.code.trim() : "";
  if (!kind || !code || code.length > 80) return null;
  if (kind === "card") {
    const type = CARD_TYPES.find((t) => t.toLowerCase() === code.toLowerCase());
    if (!type || type === "Other") return null;
    const rawLevel = typeof v.level === "string" ? v.level.trim() : "";
    if (!rawLevel) return { kind, code: type, level: null };
    if (type !== "CSCS") return null;
    const level = CSCS_LEVELS.find((l) => l.id.toLowerCase() === rawLevel.toLowerCase());
    return level ? { kind, code: type, level: level.id } : null;
  }
  const known = TICKET_TYPES.find((t) => normaliseCode(t.code) === normaliseCode(code));
  return { kind, code: known ? known.code : code, level: null };
}

function dayOf(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function isExpired(expiry: string | null, today: string): boolean {
  const day = dayOf(expiry);
  return !!day && day < today;
}

function levelSatisfies(held: string | null, needed: string): boolean {
  if (!held) return false;
  if (held.toLowerCase() === needed.toLowerCase()) return true;
  const h = CSCS_LADDER.findIndex((l) => l.toLowerCase() === held.toLowerCase());
  const n = CSCS_LADDER.findIndex((l) => l.toLowerCase() === needed.toLowerCase());
  return h >= 0 && n >= 0 && h >= n;
}

function ticketMatches(ticket: HeldTicket, code: string): boolean {
  const want = normaliseCode(code);
  const have = [ticket.code, ticket.label].map(normaliseCode);
  return have.some((h) => h === want || h.startsWith(`${want} `));
}

/** Whether the worker holds what one requirement asks for, on `today` (YYYY-MM-DD). */
export function checkRequirement(req: Requirement, holdings: Holdings, today: string): RequirementCheck {
  if (req.kind === "card") {
    const card = holdings.card;
    const sameType = !!card?.type && card.type.toLowerCase() === req.code.toLowerCase();
    if (!sameType && !req.level) {
      const asTicket = holdings.tickets.filter((t) => ticketMatches(t, req.code));
      if (asTicket.some((t) => !isExpired(t.expiry, today))) return { ok: true, unchecked: false };
    }
    if (!card || !card.type) return { ok: false, reason: "missing", detail: "No competency card on record" };
    if (!sameType) {
      return { ok: false, reason: "wrong_card", detail: `Holds a ${card.type} card` };
    }
    if (isExpired(card.expiry, today)) {
      return { ok: false, reason: "expired", detail: `${card.type} card expired ${dayOf(card.expiry)}` };
    }
    if (req.level && !levelSatisfies(card.level, req.level)) {
      return {
        ok: false,
        reason: "level_too_low",
        detail: card.level ? `Holds CSCS ${card.level}` : "CSCS colour not recorded",
      };
    }
    return { ok: true, unchecked: !card.checkedAt };
  }

  const matches = holdings.tickets.filter((t) => ticketMatches(t, req.code));
  if (!matches.length) return { ok: false, reason: "missing", detail: `No ${ticketLabel(req.code)} on record` };
  if (matches.some((t) => !isExpired(t.expiry, today))) return { ok: true, unchecked: false };
  const latest = matches
    .map((t) => dayOf(t.expiry))
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  return { ok: false, reason: "expired", detail: `${ticketLabel(req.code)} expired ${latest}` };
}

export type CardFlag = { code: "duplicate_number" | "expired" | "not_checked"; message: string };

/** Things for a supervisor to look at on a card. Flags never block anyone. */
export function cardFlags(card: HeldCard | null, today: string, sharedWith: number): CardFlag[] {
  if (!card || (!card.number && !card.type)) return [];
  const flags: CardFlag[] = [];
  if (sharedWith > 0) {
    flags.push({
      code: "duplicate_number",
      message:
        sharedWith === 1
          ? "The same card number is on another account"
          : `The same card number is on ${sharedWith} other accounts`,
    });
  }
  if (isExpired(card.expiry, today)) flags.push({ code: "expired", message: `Card expired ${dayOf(card.expiry)}` });
  if (!card.checkedAt) flags.push({ code: "not_checked", message: "Not checked by a supervisor yet" });
  return flags;
}

export function normaliseCardNumber(value: string | null | undefined): string {
  return (value ?? "").replace(/\s/g, "").toUpperCase();
}

export type ExpiryStage = "d60" | "d30" | "d7" | "expired";

/** The most urgent reminder due for an expiry date, or null when none is due today. */
export function expiryStage(expiry: string | null, today: string): ExpiryStage | null {
  const day = dayOf(expiry);
  if (!day) return null;
  const diff = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (diff < 0) return -diff <= LAPSE_NOTICE_WINDOW_DAYS ? "expired" : null;
  if (diff <= 7) return "d7";
  if (diff <= 30) return "d30";
  if (diff <= 60) return "d60";
  return null;
}
