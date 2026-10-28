import sharp from "sharp";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { EMERGENCY_PLAN_BUCKET } from "@/lib/siteAlarms/types";

export const PLAN_FILE_KINDS = ["fire_strategy", "site_plan"] as const;
export type PlanFileKind = (typeof PLAN_FILE_KINDS)[number];

export const PLAN_FILE_MAX_BYTES = 25 * 1024 * 1024;
const PLAN_IMAGE_MAX_EDGE = 4096;

export function isPlanFileKind(value: unknown): value is PlanFileKind {
  return typeof value === "string" && (PLAN_FILE_KINDS as readonly string[]).includes(value);
}

/** Site plans must be images (muster pins sit on them); the fire strategy may also be a PDF. */
export function allowedMimes(kind: PlanFileKind): string[] {
  const images = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  return kind === "fire_strategy" ? ["application/pdf", ...images] : images;
}

export function incomingPrefix(companyId: string, siteId: string): string {
  return `${companyId}/${siteId}/incoming/`;
}

export function newIncomingPath(companyId: string, siteId: string): string {
  return `${incomingPrefix(companyId, siteId)}${randomUUID()}`;
}

export type DetectedType = "pdf" | "png" | "jpeg" | "webp";

/** Trust the bytes, not the declared type. */
export function detectFileType(bytes: Uint8Array): DetectedType | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (starts([0xff, 0xd8, 0xff])) return "jpeg";
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

export type StoredPlanFile = {
  path: string;
  mime: string;
  width: number | null;
  height: number | null;
};

/**
 * Checks an upload in `incoming/`, re-encodes images (applies EXIF rotation, caps the size,
 * drops metadata) and moves the result to its final place. The incoming object is always removed.
 */
export async function finaliseUpload(opts: {
  companyId: string;
  siteId: string;
  kind: PlanFileKind;
  incomingPath: string;
}): Promise<StoredPlanFile | { error: string }> {
  const storage = supabaseAdmin.storage.from(EMERGENCY_PLAN_BUCKET);
  try {
    const { data: blob, error } = await storage.download(opts.incomingPath);
    if (error || !blob) return { error: "Upload not found. Try again." };
    if (blob.size > PLAN_FILE_MAX_BYTES) return { error: "File is too large (25 MB max)" };
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const type = detectFileType(bytes);
    if (!type) return { error: "Upload a PDF, PNG, JPG or WebP file" };
    if (opts.kind === "site_plan" && type === "pdf") {
      return { error: "The site plan must be an image so muster points can be pinned on it" };
    }

    const stamp = Date.now();
    const base = `${opts.companyId}/${opts.siteId}/${opts.kind}-${stamp}`;
    if (type === "pdf") {
      const path = `${base}.pdf`;
      const { error: upErr } = await storage.upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (upErr) return { error: "Couldn't save the file" };
      return { path, mime: "application/pdf", width: null, height: null };
    }

    const keepPng = type === "png";
    const pipeline = sharp(bytes, { limitInputPixels: 100_000_000 })
      .rotate()
      .resize({ width: PLAN_IMAGE_MAX_EDGE, height: PLAN_IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true });
    const { data: out, info } = await (keepPng ? pipeline.png({ compressionLevel: 9 }) : pipeline.jpeg({ quality: 85 })).toBuffer({
      resolveWithObject: true,
    });
    const mime = keepPng ? "image/png" : "image/jpeg";
    const path = `${base}.${keepPng ? "png" : "jpg"}`;
    const { error: upErr } = await storage.upload(path, out, { contentType: mime, upsert: false });
    if (upErr) return { error: "Couldn't save the file" };
    return { path, mime, width: info.width, height: info.height };
  } catch (e) {
    console.error("finaliseUpload:", e);
    return { error: "That file couldn't be read. Try a different file." };
  } finally {
    await storage.remove([opts.incomingPath]).catch(() => undefined);
  }
}

/** Removes stored files no longer referenced by the plan. */
export async function removeUnreferenced(paths: (string | null | undefined)[], stillUsed: (string | null | undefined)[]) {
  const keep = new Set(stillUsed.filter(Boolean));
  const drop = [...new Set(paths.filter((p): p is string => Boolean(p) && !keep.has(p)))];
  if (drop.length) await supabaseAdmin.storage.from(EMERGENCY_PLAN_BUCKET).remove(drop).catch(() => undefined);
}
