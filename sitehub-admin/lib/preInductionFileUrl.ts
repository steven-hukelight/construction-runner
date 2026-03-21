/**
 * Pre-induction documents are stored in a private bucket.
 * Use this helper to get a viewable URL that goes through our auth proxy.
 */
export function getPreInductionFileViewUrl(storedUrl: string | null | undefined): string | null {
  if (!storedUrl || typeof storedUrl !== "string") return null;
  const trimmed = storedUrl.trim();
  if (!trimmed) return null;
  // Only proxy Supabase pre-induction storage URLs
  if (!trimmed.includes("storage") || !trimmed.includes("pre-induction")) return trimmed;
  return `/api/pre-induction/file?url=${encodeURIComponent(trimmed)}`;
}
