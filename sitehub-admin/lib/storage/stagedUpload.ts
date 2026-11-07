/**
 * Large files go straight from the browser to Storage, because Vercel functions reject
 * request bodies over 4.5 MB. `startStagedUpload` issues a one-off signed upload URL in the
 * bucket's `incoming/` folder plus a token naming that path; the owning route later calls
 * `claimStagedUpload` with the token to check the file and move it to its final path. The
 * route still runs all of its own authorisation before claiming.
 */
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RAMS_MAX_UPLOAD_BYTES } from "@/lib/ramsUploadLimits";

const DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;
const TOKEN_TTL_MS = 60 * 60 * 1000;

export const STAGED_UPLOAD_KINDS = {
  rams: { bucket: "rams", maxBytes: RAMS_MAX_UPLOAD_BYTES },
  briefing: { bucket: "briefings", maxBytes: DOCUMENT_MAX_BYTES },
  "site-rule": { bucket: "uploads", maxBytes: DOCUMENT_MAX_BYTES },
  "asset-document": { bucket: "assets", maxBytes: DOCUMENT_MAX_BYTES },
  "training-video": { bucket: "training-videos", maxBytes: DOCUMENT_MAX_BYTES },
  "training-document": { bucket: "training-documents", maxBytes: 20 * 1024 * 1024 },
} as const;

export type StagedUploadKind = keyof typeof STAGED_UPLOAD_KINDS;

export function isStagedUploadKind(value: unknown): value is StagedUploadKind {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(STAGED_UPLOAD_KINDS, value);
}

function signingKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createHmac("sha256", secret).update("staged-upload-v1").digest();
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 150) || "file";
}

export async function startStagedUpload(
  kind: StagedUploadKind,
  fileName: string,
  size: number,
): Promise<{ uploadUrl: string; token: string } | { error: string; status: number }> {
  const { bucket, maxBytes } = STAGED_UPLOAD_KINDS[kind];
  if (!Number.isFinite(size) || size <= 0) return { error: "File is empty", status: 400 };
  if (size > maxBytes) return { error: `File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`, status: 400 };

  const path = `incoming/${randomUUID()}/${safeFileName(fileName)}`;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl failed:", error);
    return { error: "Couldn't start the upload", status: 500 };
  }
  const payload = Buffer.from(JSON.stringify({ k: kind, p: path, exp: Date.now() + TOKEN_TTL_MS })).toString("base64url");
  return { uploadUrl: data.signedUrl, token: `${payload}.${sign(payload)}` };
}

function readToken(token: string, kind: StagedUploadKind): string | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { k?: string; p?: string; exp?: number };
    if (parsed.k !== kind || typeof parsed.p !== "string" || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed.p;
  } catch {
    return null;
  }
}

export type ClaimedUpload = { path: string; fileName: string; size: number; contentType: string };

/** Moves the staged file to `finalPath` in the kind's bucket. Each token can be claimed once. */
export async function claimStagedUpload(
  kind: StagedUploadKind,
  token: string,
  finalPath: string,
): Promise<ClaimedUpload | { error: string }> {
  const stagedPath = readToken(token, kind);
  if (!stagedPath) return { error: "Upload expired. Try again." };
  const { bucket, maxBytes } = STAGED_UPLOAD_KINDS[kind];
  const storage = supabaseAdmin.storage.from(bucket);

  const slash = stagedPath.lastIndexOf("/");
  const folder = stagedPath.slice(0, slash);
  const fileName = stagedPath.slice(slash + 1);
  const { data: listed } = await storage.list(folder, { limit: 2 });
  const object = listed?.find((o) => o.name === fileName);
  const size = Number(object?.metadata?.size ?? 0);
  if (!object || size <= 0) return { error: "Upload not found. Try again." };
  if (size > maxBytes) {
    await storage.remove([stagedPath]);
    return { error: `File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)` };
  }

  const { error } = await storage.move(stagedPath, finalPath);
  if (error) {
    console.error("claimStagedUpload move failed:", error);
    return { error: "Couldn't save the file" };
  }
  return {
    path: finalPath,
    fileName,
    size,
    contentType: String(object.metadata?.mimetype ?? "application/octet-stream"),
  };
}
