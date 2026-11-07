export type TrainingStatus = "not_started" | "in_progress" | "passed" | "due_again";
export type FaceFitStatus = "current" | "review_soon" | "due";

export type CatalogueModule = {
  id: string;
  kind: "video" | "record";
  title: string;
  summary: string;
  minutes: number | null;
  /** `company` is this company's own upload; `video` and `link` are the defaults. */
  source: "company" | "video" | "link" | null;
  /** This company's own video or PDF, which replaces the default for its people. */
  companyMaterial: { type: "video" | "document"; name: string } | null;
  externalUrl: string | null;
  publisher: string | null;
  acknowledgement: string | null;
  minWatchSeconds: number | null;
  ready: boolean;
  questionCount: number;
  enabled: boolean;
  refreshMonths: number | null;
  scope: "company" | "sites";
  siteIds: string[];
};

export type CatalogueResponse = {
  canConfigure: boolean;
  canRecord: boolean;
  canEditCatalogue: boolean;
  sites: { id: string; name: string }[];
  modules: CatalogueModule[];
};

export const STATUS_LABEL: Record<TrainingStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  passed: "Passed",
  due_again: "Due again",
};

export const STATUS_CHIP: Record<TrainingStatus, string> = {
  not_started: "status-chip--muted",
  in_progress: "status-chip--info",
  passed: "status-chip--ok",
  due_again: "status-chip--warn",
};

export const FACE_FIT_LABEL: Record<FaceFitStatus, string> = {
  current: "Current",
  review_soon: "Review soon",
  due: "Due",
};

export const FACE_FIT_CHIP: Record<FaceFitStatus, string> = {
  current: "status-chip--ok",
  review_soon: "status-chip--warn",
  due: "status-chip--danger",
};

export function ukDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "medium" }).format(d);
}

export async function readError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  return data.message || data.error || fallback;
}
