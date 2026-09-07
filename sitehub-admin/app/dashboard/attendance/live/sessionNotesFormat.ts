import { formatDate } from "@/app/DisplayPreferencesProvider";
import { parseAbsentForDate, parseYmd } from "@/lib/attendanceAbsent";

export type AutoSignOutNoteMeta = {
  auto_sign_out: true;
  exit_time?: string;
  exit_time_millis?: number;
  auto_sign_out_reason?: string;
};

function tryParseAutoSignOutJson(segment: string): AutoSignOutNoteMeta | null {
  const s = segment.trim();
  if (!s.startsWith("{")) return null;
  try {
    const o = JSON.parse(s) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    const auto = o.auto_sign_out === true || o.auto_sign_out === "true";
    if (!auto) return null;
    const em = o.exit_time_millis;
    let exitMillis: number | undefined;
    if (typeof em === "number" && Number.isFinite(em)) exitMillis = em;
    else if (em != null && String(em).trim()) {
      const n = Number(String(em).trim());
      if (Number.isFinite(n)) exitMillis = n;
    }
    return {
      auto_sign_out: true,
      exit_time: o.exit_time != null ? String(o.exit_time) : undefined,
      exit_time_millis: exitMillis,
      auto_sign_out_reason: o.auto_sign_out_reason != null ? String(o.auto_sign_out_reason) : undefined,
    };
  } catch {
    /* not JSON */
  }
  return null;
}

/** DD/MM/YYYY : HH:MM in the viewer's local timezone */
function formatFenceLoggedDisplay(meta: AutoSignOutNoteMeta): string | null {
  let d: Date | null = null;
  if (meta.exit_time?.trim()) {
    const t = new Date(meta.exit_time.trim());
    if (!Number.isNaN(t.getTime())) d = t;
  }
  if (!d && meta.exit_time_millis != null) {
    const t = new Date(Number(meta.exit_time_millis));
    if (!Number.isNaN(t.getTime())) d = t;
  }
  if (!d) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} : ${hh}:${mi}`;
}

/** Shared copy for Notes panel + attendance record card */
export function describeAttendanceAutoSignOutReason(reason: string | undefined): string {
  const r = (reason ?? "").toLowerCase().trim();
  if (r === "fallback_stale_outside") {
    return "Server fallback — no recent ping for ~25s while last known position was outside the site boundary.";
  }
  if (r === "geofence_exit_immediate") {
    return "Trusted geofence exit ping — server confirmed coordinates beyond the outside threshold and closed the session immediately.";
  }
  if (r === "fallback") {
    return "Server check — signed out after location looked off-site without a recent on-site ping.";
  }
  if (r === "native_geofence" || r.includes("native_geofence")) {
    return "Device reported leaving the site boundary (geofence).";
  }
  if (r === "geofence_exit" || r.includes("geofence")) {
    return "Left the site boundary (geofence).";
  }
  if (r) return r.replace(/_/g, " ");
  return "Automatic sign-out";
}

function refinedAutoSignOutBody(meta: AutoSignOutNoteMeta): string {
  const lines: string[] = [];
  const stamp = formatFenceLoggedDisplay(meta);
  if (stamp) {
    lines.push(`Date & time (when the server logged this): ${stamp}`);
  }
  lines.push(`Reason: ${describeAttendanceAutoSignOutReason(meta.auto_sign_out_reason)}`);
  return lines.join("\n");
}

/** Same DB row can supply sign-in + sign-out; notes get merged twice — breaks JSON.parse on the whole string. */
function dedupeRepeatedNoteBlocks(s: string): string {
  const parts = s
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (!out.includes(p)) out.push(p);
  }
  return out.join("\n\n");
}

function splitNotesAndAutoMeta(raw: string): { userText: string; meta: ReturnType<typeof tryParseAutoSignOutJson> } {
  const trimmed = raw.trim();
  const metaWhole = tryParseAutoSignOutJson(trimmed);
  if (metaWhole) return { userText: "", meta: metaWhole };

  const brace = trimmed.indexOf("{");
  if (brace >= 0) {
    const fromBrace = trimmed.slice(brace).trim();
    const metaBrace = tryParseAutoSignOutJson(fromBrace);
    if (metaBrace) {
      return { userText: trimmed.slice(0, brace).trim(), meta: metaBrace };
    }
  }

  const lastNl = trimmed.lastIndexOf("\n");
  if (lastNl === -1) return { userText: trimmed, meta: null };
  const head = trimmed.slice(0, lastNl).trim();
  const tail = trimmed.slice(lastNl + 1);
  const meta = tryParseAutoSignOutJson(tail);
  if (!meta) return { userText: trimmed, meta: null };
  return { userText: head, meta };
}

function autoSignOutNotesLabel(meta: AutoSignOutNoteMeta): string {
  const r = meta.auto_sign_out_reason;
  if (r === "fallback_stale_outside") return "Automatic sign-out (server fallback)";
  if (r === "geofence_exit_immediate") return "Automatic sign-out (geofence, immediate)";
  if (r === "fallback") return "Automatic sign-out (server check)";
  if (r === "native_geofence") return "Automatic sign-out (geofence)";
  if (r && String(r).trim()) {
    return `Automatic sign-out (${String(r).replace(/_/g, " ")})`;
  }
  return "Automatic sign-out";
}

export type NotesDisplay = { variant: "absent" | "auto" | "plain"; main: string; detail?: string };

/** Human-readable notes for the entry / exit details drawer */
export function formatAttendanceNotesDisplay(notes: string | undefined): NotesDisplay {
  const raw = dedupeRepeatedNoteBlocks(notes?.trim() ?? "");
  if (!raw) return { variant: "plain", main: "—" };
  const ymd = parseAbsentForDate(raw);
  if (ymd) {
    const parsed = parseYmd(ymd);
    const d = parsed ? new Date(parsed.y, parsed.m - 1, parsed.d) : null;
    const dateLabel = d && !isNaN(d.getTime()) ? formatDate(d) : ymd;
    let userExtra = "";
    const sep = raw.indexOf(" | ");
    if (sep !== -1) userExtra = raw.slice(sep + 3).trim();
    return {
      variant: "absent",
      main: "Absent",
      detail: userExtra ? `for ${dateLabel} · ${userExtra}` : `for ${dateLabel}`,
    };
  }

  const { userText, meta } = splitNotesAndAutoMeta(raw);
  if (meta) {
    const refined = refinedAutoSignOutBody(meta);
    const extra = userText.trim();
    const detail = extra ? `${extra}\n\n${refined}` : refined;
    return {
      variant: "auto",
      main: autoSignOutNotesLabel(meta),
      detail,
    };
  }

  // Last resort: last paragraph only is auto JSON (e.g. odd wrapping) — still show refined, not raw.
  const blocks = raw.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length >= 1) {
    const last = blocks[blocks.length - 1]!;
    const tailMeta = tryParseAutoSignOutJson(last);
    if (tailMeta) {
      const head = blocks.slice(0, -1).join("\n\n").trim();
      const refined = refinedAutoSignOutBody(tailMeta);
      const detail = head ? `${head}\n\n${refined}` : refined;
      return {
        variant: "auto",
        main: autoSignOutNotesLabel(tailMeta),
        detail,
      };
    }
  }

  return { variant: "plain", main: raw };
}
