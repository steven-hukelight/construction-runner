/**
 * COSHH row shape for the admin UI (camelCase).
 * DB may use snake_case and/or pack fields into `body` JSON when columns are missing.
 */

export type CoshhClientRow = {
  id: string;
  title?: string;
  substance?: string;
  hazardSymbols?: string[];
  ppe?: string;
  fileUrl?: string;
  /** Plain-text body when DB stores non-JSON notes (legacy rows). */
  legacyBody?: string;
};

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string" && v.trim()) {
    try {
      const p = JSON.parse(v) as unknown;
      if (Array.isArray(p)) return p.map((x) => String(x));
    } catch {
      return v.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return undefined;
}

/** Map Supabase row → table/API camelCase for the dashboard. */
export function normalizeCoshhRow(d: Record<string, unknown>): CoshhClientRow {
  const fromBody: {
    substance?: string;
    hazardSymbols?: string[];
    ppe?: string;
  } = {};
  const rawBody = d.body;
  if (typeof rawBody === "string" && rawBody.trim()) {
    try {
      const p = JSON.parse(rawBody) as Record<string, unknown>;
      if (typeof p.substance === "string") fromBody.substance = p.substance;
      if (typeof p.ppe === "string") fromBody.ppe = p.ppe;
      const hs = p.hazardSymbols ?? p.hazard_symbols;
      const arr = asStringArray(hs);
      if (arr?.length) fromBody.hazardSymbols = arr;
    } catch {
      /* ignore */
    }
  }

  const substanceCol = d.substance;
  const ppeCol = d.ppe;
  const hazardCol = d.hazard_symbols ?? d.hazardSymbols;

  const substance =
    (typeof substanceCol === "string" ? substanceCol : undefined) ??
    fromBody.substance ??
    "";
  const ppe = (typeof ppeCol === "string" ? ppeCol : undefined) ?? fromBody.ppe ?? "";
  const hazardSymbols =
    asStringArray(hazardCol) ?? fromBody.hazardSymbols ?? [];

  const fileRaw = d.file_url ?? d.fileUrl;
  const fileUrl = typeof fileRaw === "string" && fileRaw ? fileRaw : undefined;

  let legacyBody: string | undefined;
  const rawBodyStr = typeof rawBody === "string" ? rawBody.trim() : "";
  if (rawBodyStr) {
    try {
      JSON.parse(rawBodyStr);
    } catch {
      legacyBody = rawBodyStr;
    }
  }

  return {
    id: String(d.id ?? ""),
    title: typeof d.title === "string" ? d.title : undefined,
    substance,
    hazardSymbols,
    ppe,
    fileUrl,
    legacyBody,
  };
}
