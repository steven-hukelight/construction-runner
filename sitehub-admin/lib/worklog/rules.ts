export const NAME_LIST_LIMIT = 2000;

/** Split a pasted list on new lines or commas. Blank lines and repeats are dropped. */
export function parseNameList(raw: string, limit = NAME_LIST_LIMIT): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw ?? "").split(/[\n,]/)) {
    const name = part.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

/** Dedupe an already-split list. Does not split on commas. */
export function uniquePlaceNames(names: string[], limit = NAME_LIST_LIMIT): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = String(raw ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

function tidyPart(raw: string): string {
  return String(raw ?? "").trim().replace(/\s+/g, " ");
}

function coreLabel(raw: string): string {
  const t = tidyPart(raw);
  if (!t) return "";
  return /^core\b/i.test(t) ? t : `Core ${t}`;
}

/** Housing plot names from a block/core and a number run. */
export function plotRunNames(input: {
  block?: string;
  core?: string;
  from: number;
  to: number;
  pad?: boolean;
}): string[] {
  const from = Math.trunc(Number(input.from));
  const to = Math.trunc(Number(input.to));
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) return [];
  const count = to - from + 1;
  if (count > NAME_LIST_LIMIT) return [];
  const block = tidyPart(input.block ?? "");
  const core = coreLabel(input.core ?? "");
  const prefix = [block, core].filter(Boolean).join(" ");
  const head = prefix ? `${prefix} Plot ` : "Plot ";
  const width = input.pad ? String(to).length : 0;
  const out: string[] = [];
  for (let n = from; n <= to; n++) {
    const num = width ? String(n).padStart(width, "0") : String(n);
    out.push(`${head}${num}`.slice(0, 80));
  }
  return out;
}

/** One plot name from a spreadsheet cell. Numbers become “Block D Core 1 Plot 40”. */
export function plotPlaceName(block: string, core: string, plot: string): string | null {
  const plotRaw = tidyPart(plot);
  if (!plotRaw) return null;
  const numeric = plotRaw.replace(/^(plot\s+)/i, "");
  if (/^\d+$/.test(numeric)) {
    return plotRunNames({ block, core, from: Number(numeric), to: Number(numeric) })[0] ?? null;
  }
  return plotRaw.slice(0, 80);
}

function detectCsvDelimiter(headerLine: string): string {
  const comma = (headerLine.match(/,/g) ?? []).length;
  const semi = (headerLine.match(/;/g) ?? []).length;
  const tab = (headerLine.match(/\t/g) ?? []).length;
  if (tab > comma && tab > semi) return "\t";
  if (semi > comma) return ";";
  return ",";
}

/** RFC-style CSV/TSV rows. Quotes, BOM, commas inside cells, and ; or tab delimiters. */
export function parseCsvTable(raw: string): string[][] {
  const text = String(raw ?? "").replace(/^\uFEFF/, "");
  if (!text.trim()) return [];
  const delim = detectCsvDelimiter(text.split(/\r?\n/, 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delim) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell.trim());
      cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
      continue;
    }
    if (ch !== "\r") cell += ch;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function headerKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function columnIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => aliases.includes(headerKey(h)));
}

/** Place names from a CSV. One name column, or Block / Core / Plot. */
export function namesFromPlaceCsv(raw: string, limit = NAME_LIST_LIMIT): string[] {
  const table = parseCsvTable(raw);
  if (!table.length) return [];
  const headers = table[0].map(headerKey);
  const nameIdx = columnIndex(headers, ["name", "place", "places", "location", "area"]);
  const plotIdx = columnIndex(headers, ["plot", "plot no", "plot number", "plotno", "unit", "plot name"]);
  const blockIdx = columnIndex(headers, ["block", "blk", "building"]);
  const coreIdx = columnIndex(headers, ["core", "cores", "core no", "core number"]);
  const hasHeader = nameIdx >= 0 || plotIdx >= 0 || blockIdx >= 0;
  const body = hasHeader ? table.slice(1) : table;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of body) {
    let name = "";
    if (hasHeader) {
      const plot = plotIdx >= 0 ? row[plotIdx] ?? "" : "";
      const named = nameIdx >= 0 ? row[nameIdx] ?? "" : "";
      const block = blockIdx >= 0 ? row[blockIdx] ?? "" : "";
      const core = coreIdx >= 0 ? row[coreIdx] ?? "" : "";
      name = plotPlaceName(block, core, plot || named) ?? "";
    } else {
      name = tidyPart(row[0] ?? "");
    }
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name.slice(0, 80));
    if (out.length >= limit) break;
  }
  return out;
}

function looksLikePlaceCsvHeader(line: string): boolean {
  const key = headerKey(line);
  return /\b(block|core|plot|name|place|unit)\b/.test(key) && /[,;\t]/.test(line);
}

function pdfLines(raw: string): string[] {
  const text = String(raw ?? "").replace(/\u00a0/g, " ");
  const direct = text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (direct.length >= 2) return direct;
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+(?=(?:block|blk|core|plot|plt|unit)\s)/gi, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isPdfNoiseLine(line: string): boolean {
  if (/^page\s+\d+/i.test(line)) return true;
  if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(line)) return true;
  if (/copyright|confidential|all rights reserved/i.test(line)) return true;
  return false;
}

function isYearToken(value: string): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1900 && n <= 2099;
}

function parsePlotHeading(line: string): { block?: string; core?: string } | null {
  const block = line.match(
    /^((?:block|blk)\s+[a-z0-9][a-z0-9\-\/]*)(?:\s*(?:[-–,|]|core)\s*(?:core\s+)?([a-z0-9][a-z0-9\-\/]*))?(?:\s+plot\b.*)?$/i,
  );
  if (block) return { block: block[1], core: block[2] };
  const core = line.match(/^core\s+([a-z0-9][a-z0-9\-\/]*)$/i);
  if (core) return { core: core[1] };
  return null;
}

function isNumberListLine(line: string): boolean {
  if (/^(?:\d{1,4}[a-z]?)(?:[\s,;]+(?:\d{1,4}[a-z]?))+$/i.test(line)) return true;
  return /^\d{1,4}[a-z]?$/i.test(line) && !isYearToken(line);
}

const PDF_PLOT_TOKEN = /\b(?:plot|plt|unit)\s*[:#-]?\s*(\d+[a-z]?)\b/gi;
const PDF_FULL_PLOT =
  /((?:block|blk)\s+[a-z0-9][a-z0-9\-\/]*)(?:\s+core\s+([a-z0-9][a-z0-9\-\/]*))?\s+plot\s+(\d+[a-z]?)/gi;

/** Place names from PDF text: CSV-like tables, plot lists, or Block/Core headings plus numbers. */
export function namesFromPlacePdfText(raw: string, limit = NAME_LIST_LIMIT): string[] {
  const first = String(raw ?? "").split(/\r?\n/, 1)[0] ?? "";
  if (looksLikePlaceCsvHeader(first)) {
    const csv = namesFromPlaceCsv(raw, limit);
    if (csv.length) return csv;
  }

  const lines = pdfLines(raw);
  const seen = new Set<string>();
  const out: string[] = [];
  let block = "";
  let core = "";
  let explicit = 0;
  let inTable = false;

  const push = (name: string | null, isExplicit = false) => {
    const n = String(name ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80);
    if (!n) return;
    const key = n.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(n);
    if (isExplicit) explicit += 1;
  };

  const takeNamedPlots = (text: string) => {
    PDF_FULL_PLOT.lastIndex = 0;
    for (const m of text.matchAll(PDF_FULL_PLOT)) {
      push(plotPlaceName(m[1], m[2] ?? core, m[3]), true);
      if (out.length >= limit) return;
    }
    PDF_PLOT_TOKEN.lastIndex = 0;
    for (const m of text.matchAll(PDF_PLOT_TOKEN)) {
      push(plotPlaceName(block, core, m[1]), true);
      if (out.length >= limit) return;
    }
  };

  for (const line of lines) {
    if (out.length >= limit) break;
    if (isPdfNoiseLine(line)) continue;

    const heading = parsePlotHeading(line);
    if (heading) {
      if (heading.block != null) block = heading.block;
      if (heading.core != null) core = heading.core;
    }

    if (/^(plot(?:\s+(?:no|number|name))?|unit|place|name)\b/i.test(line) && !/\d/.test(line)) {
      inTable = true;
      continue;
    }

    takeNamedPlots(line);
    if (out.length >= limit) break;

    if (inTable) {
      const firstCell = line.split(/\s+/)[0] ?? "";
      if (/^\d+[a-z]?$/i.test(firstCell) && !isYearToken(firstCell)) {
        push(plotPlaceName(block, core, firstCell), true);
        continue;
      }
      if (!heading && !isNumberListLine(line)) inTable = false;
    }

    if (block && isNumberListLine(line)) {
      for (const n of line.split(/[\s,;]+/).filter(Boolean)) {
        if (!/^\d{1,4}[a-z]?$/i.test(n) || isYearToken(n)) continue;
        push(plotPlaceName(block, core, n), false);
        if (out.length >= limit) break;
      }
    }
  }

  if (!out.length) takeNamedPlots(String(raw ?? "").replace(/\s+/g, " "));
  if (out.length === 1 && explicit === 0) return [];
  return out.slice(0, limit);
}

/** "Block D Core 1 Plot 40" → "Block D Core 1". Names with no plot number stay Other. */
export function placeGroupLabel(name: string): string {
  const m = String(name ?? "")
    .trim()
    .match(/^(.*?)\s+plot\s+\d+\s*$/i);
  const prefix = m?.[1]?.trim();
  return prefix ? prefix : "Other";
}

/** Latest visit per place, in the order the rows were already sorted (newest first). */
export function uniqueRecentPlaces(
  rows: { place_id: string; activity_id: string }[],
  limit = 6,
): { placeId: string; activityId: string }[] {
  const seen = new Set<string>();
  const out: { placeId: string; activityId: string }[] = [];
  for (const row of rows) {
    const placeId = String(row.place_id ?? "").trim();
    const activityId = String(row.activity_id ?? "").trim();
    if (!placeId || !activityId || seen.has(placeId)) continue;
    seen.add(placeId);
    out.push({ placeId, activityId });
    if (out.length >= limit) break;
  }
  return out;
}

/** UTC instant of midnight in London on the calendar day that contains `now`. */
export function londonMidnightIso(now = new Date()): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const probe = new Date(`${day}T00:00:00Z`);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(probe),
  );
  probe.setUTCHours(probe.getUTCHours() - (Number.isFinite(hour) ? hour : 0));
  return probe.toISOString();
}
