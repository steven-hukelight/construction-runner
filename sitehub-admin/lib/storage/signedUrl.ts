import { createSignedUrl } from "@/supabase/storage/storageClient";

const ALLOWED_BUCKETS = new Set([
  "briefings", "rams", "rams_documents", "uploads", "asset_documents", "asset_photos",
  "near_miss_reports", "company_documents", "assets", "medical", "pre-induction",
]);

/** Extract bucket and path from a Supabase storage URL or path-like string. */
export function extractBucketAndPath(input: string): { bucket: string; path: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const decoded = decodeURIComponent(trimmed);
      const u = new URL(decoded);
      const match = u.pathname.match(/\/storage\/v1\/object\/[^/]+\/([^/]+)\/(.+)$/);
      if (!match) return null;
      const [, bucket, path] = match;
      if (!bucket || !path) return null;
      return { bucket: decodeURIComponent(bucket), path: decodeURIComponent(path) };
    }
    if (trimmed.includes("/")) {
      const parts = trimmed.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const bucket = parts[0];
        if (ALLOWED_BUCKETS.has(bucket)) {
          return { bucket, path: parts.slice(1).join("/") };
        }
      }
      if (trimmed.startsWith("near_miss/") || trimmed.includes("near_miss/")) {
        return { bucket: "asset_photos", path: trimmed };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/** Resolve a storage URL/path to a signed URL. Returns null on failure. */
export async function resolveSignedUrl(rawUrl: string): Promise<string | null> {
  const extracted = extractBucketAndPath(rawUrl);
  if (!extracted) return null;
  const { bucket, path } = extracted;
  if (!ALLOWED_BUCKETS.has(bucket)) return null;
  try {
    return await createSignedUrl(bucket, path, 3600);
  } catch {
    return null;
  }
}
