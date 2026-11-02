import type { StagedUploadKind } from "@/lib/storage/stagedUpload";

/** Uploads `file` straight to Storage and returns the token the owning route expects as `stagedToken`. */
export async function stageUpload(kind: StagedUploadKind, file: File): Promise<string> {
  const start = await fetch("/api/storage/staged-upload", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, fileName: file.name, size: file.size }),
  });
  const started = (await start.json().catch(() => ({}))) as { uploadUrl?: string; token?: string; error?: string };
  if (!start.ok || !started.uploadUrl || !started.token) throw new Error(started.error ?? "Couldn't start the upload");

  const put = await fetch(started.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!put.ok) throw new Error("Upload failed. Check your connection and try again.");
  return started.token;
}

/** Stages `file` and adds `stagedToken` and `fileName` to `form` in place of a `file` field. */
export async function appendStagedFile(form: FormData, kind: StagedUploadKind, file: File): Promise<void> {
  form.append("stagedToken", await stageUpload(kind, file));
  form.append("fileName", file.name);
}
