export type DocumentRemindPayload = {
  reminded?: number;
  skippedRecent?: number;
  skippedInduction?: number;
  skippedCap?: number;
  pushSent?: boolean;
  pushError?: string | null;
};

export function remindResultMessage(result: DocumentRemindPayload): string {
  const reminded = result.reminded ?? 0;
  if (reminded === 0) {
    if ((result.skippedRecent ?? 0) > 0) {
      return "Already reminded in the last 24 hours.";
    }
    if ((result.skippedInduction ?? 0) > 0) {
      return "No one to remind — outstanding people still need induction.";
    }
    return "No outstanding people to remind.";
  }
  const parts = [`Reminded ${reminded} ${reminded === 1 ? "person" : "people"}`];
  if (result.skippedRecent) parts.push(`${result.skippedRecent} already reminded today`);
  if (result.skippedInduction) parts.push(`${result.skippedInduction} skipped (induction incomplete)`);
  if (result.skippedCap) parts.push(`${result.skippedCap} over the 50-person cap`);
  return `${parts.join(". ")}.`;
}

export async function postDocumentRemind(
  kind: "briefing" | "rams",
  documentId: string,
  companyId: string
): Promise<{ ok: boolean; message: string; lastRemindedAt?: string | null }> {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
  const path = kind === "briefing" ? `/api/briefings/${documentId}/remind` : `/api/rams/${documentId}/remind`;
  const res = await fetch(`${path}${q}`, { method: "POST", credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as DocumentRemindPayload & {
    error?: string;
    lastRemindedAt?: string | null;
  };
  if (!res.ok) {
    return { ok: false, message: typeof json.error === "string" ? json.error : "Remind failed" };
  }
  return {
    ok: true,
    message: remindResultMessage(json),
    lastRemindedAt: json.lastRemindedAt ?? null,
  };
}
