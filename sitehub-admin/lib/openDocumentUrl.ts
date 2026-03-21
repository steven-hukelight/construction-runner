/**
 * Open a storage document URL. For private buckets, fetches a signed URL first
 * to avoid "could not open file" / 403 errors.
 */
export async function openDocumentUrl(storedUrl: string): Promise<void> {
  if (!storedUrl?.trim()) return;
  try {
    const res = await fetch(
      `/api/storage/signed-url?url=${encodeURIComponent(storedUrl)}`,
      { credentials: "include" }
    );
    const data = await res.json().catch(() => ({}));
    const url = data?.url;
    if (url && typeof url === "string") {
      window.open(url, "_blank", "noopener");
      return;
    }
    // Signed URL failed - don't fall back to raw URL (would 403 on private buckets)
    const err = data?.error ?? (res.ok ? null : `Request failed (${res.status})`);
    if (err) {
      console.warn("openDocumentUrl: signed URL failed:", err);
      alert(`Could not open document. ${typeof err === "string" ? err : "Please try again."}`);
    } else {
      window.open(storedUrl, "_blank", "noopener");
    }
  } catch (e) {
    console.warn("openDocumentUrl error:", e);
    alert("Could not open document. Please try again.");
  }
}
