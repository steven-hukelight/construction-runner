import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  londonCalendarDayUtcBounds,
  londonStartOfCalendarDayUtc,
  londonYmd,
} from "@/lib/attendanceLondonDay";

const PAGE = 500;
const CHUNK = 200;

type AttendanceRow = Record<string, unknown> & {
  id: string;
  timestamp?: string | null;
  created_at?: string | null;
};

export type AttendanceArchiveResult = {
  success: true;
  archived: number;
  deleted: number;
  archiveDate?: string;
  cutoffIso: string;
  message?: string;
  ranAt: string;
};

function rowInstant(r: AttendanceRow): Date | null {
  const raw = r.timestamp ?? r.created_at;
  if (!raw) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toArchiveInsert(r: AttendanceRow, archiveDateStr: string) {
  return {
    id: r.id,
    user_id: r.user_id,
    site_id: r.site_id,
    company_id: r.company_id ?? "",
    action: r.action ?? "SIGN IN",
    timestamp: r.timestamp,
    latitude: r.latitude,
    longitude: r.longitude,
    accuracy: r.accuracy,
    email: r.email,
    archive_date: archiveDateStr,
    created_at: r.created_at ?? new Date().toISOString(),
    auto_sign_out: r.auto_sign_out ?? null,
    auto_sign_out_reason: r.auto_sign_out_reason ?? null,
    exit_time_millis: r.exit_time_millis ?? null,
    exit_time: r.exit_time ?? null,
    exit_lat: r.exit_lat ?? r.exit_latitude ?? null,
    exit_lng: r.exit_lng ?? r.exit_longitude ?? null,
    exit_accuracy: r.exit_accuracy ?? null,
    last_location_lat: r.last_location_lat ?? r.last_known_latitude ?? null,
    last_location_lng: r.last_location_lng ?? r.last_known_longitude ?? null,
    last_location_accuracy: r.last_location_accuracy ?? r.last_known_accuracy ?? null,
    last_location_timestamp: r.last_location_timestamp ?? r.last_activity_at ?? null,
    sign_out_time: r.sign_out_time ?? null,
  };
}

async function fetchAttendanceWhere(
  apply: (q: ReturnType<ReturnType<typeof supabaseAdmin.from>["select"]>) => ReturnType<
    ReturnType<typeof supabaseAdmin.from>["select"]
  >
): Promise<AttendanceRow[]> {
  const acc: AttendanceRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await apply(
      supabaseAdmin.from("attendance").select("*")
    )
      .order("timestamp", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as AttendanceRow[];
    if (!batch.length) break;
    acc.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return acc;
}

async function upsertAndDelete(rows: AttendanceRow[], archiveDateFor: (r: AttendanceRow) => string) {
  if (!rows.length) return;
  const inserts = rows.map((r) => toArchiveInsert(r, archiveDateFor(r)));
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const slice = inserts.slice(i, i + CHUNK);
    const { error: insertError } = await supabaseAdmin.from("attendance_archive").upsert(slice, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (insertError) {
      throw new Error("Failed to archive: " + insertError.message);
    }
  }
  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { error: deleteError } = await supabaseAdmin.from("attendance").delete().in("id", slice);
    if (deleteError) {
      throw new Error("Archived but failed to clear live list: " + deleteError.message);
    }
  }
}

/**
 * Move live attendance older than UK midnight onto attendance_archive.
 * With no date: everything before the current London calendar day (cron).
 * With date: that London calendar day only (manual).
 */
export async function runAttendanceDailyArchive(opts?: {
  dateYmd?: string;
  now?: Date;
}): Promise<AttendanceArchiveResult> {
  const now = opts?.now ?? new Date();
  const todayLondon = londonYmd(now);
  const cutoff = londonStartOfCalendarDayUtc(todayLondon);
  const ranAt = now.toISOString();

  let rows: AttendanceRow[];
  if (opts?.dateYmd) {
    const bounds = londonCalendarDayUtcBounds(opts.dateYmd);
    rows = await fetchAttendanceWhere((q) =>
      q.gte("timestamp", bounds.start).lt("timestamp", bounds.end)
    );
    if (!rows.length) {
      return {
        success: true,
        archived: 0,
        deleted: 0,
        archiveDate: opts.dateYmd,
        cutoffIso: bounds.start,
        message: "No entries to archive",
        ranAt,
      };
    }
    await upsertAndDelete(rows, () => opts.dateYmd as string);
    return {
      success: true,
      archived: rows.length,
      deleted: rows.length,
      archiveDate: opts.dateYmd,
      cutoffIso: bounds.start,
      ranAt,
    };
  }

  rows = await fetchAttendanceWhere((q) => q.lt("timestamp", cutoff.toISOString()));
  if (!rows.length) {
    return {
      success: true,
      archived: 0,
      deleted: 0,
      cutoffIso: cutoff.toISOString(),
      message: "No entries to archive",
      ranAt,
    };
  }

  await upsertAndDelete(rows, (r) => {
    const inst = rowInstant(r);
    return inst ? londonYmd(inst) : addFallbackArchiveDate(todayLondon);
  });

  return {
    success: true,
    archived: rows.length,
    deleted: rows.length,
    cutoffIso: cutoff.toISOString(),
    ranAt,
  };
}

function addFallbackArchiveDate(todayLondon: string): string {
  const [y, m, d] = todayLondon.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}-${String(prev.getUTCDate()).padStart(2, "0")}`;
}
