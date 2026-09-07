/** In-app feedback — Construction Runner (web + mirror in mobile mailto / UrlLauncher). */
export const FEEDBACK_EMAIL = "info@construction-runner.com";

const FEEDBACK_SUBJECT = "Construction Runner — app feedback";

export const FEEDBACK_MAILTO = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(FEEDBACK_SUBJECT)}`;

/** Account / GDPR deletion requests (Play policy + user rights). */
export const ACCOUNT_DELETION_REQUEST_SUBJECT =
  "Construction Runner — data or account deletion request";

export const ACCOUNT_DELETION_REQUEST_MAILTO = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
  ACCOUNT_DELETION_REQUEST_SUBJECT,
)}`;

/** IDs must match POST /api/feedback validation. */
export const FEEDBACK_CATEGORY_OPTIONS = [
  { id: "bug", label: "Bug / something broke" },
  { id: "feature", label: "Feature idea" },
  { id: "ux", label: "Usability or design" },
  { id: "account", label: "Account or sign-in" },
  { id: "other", label: "Other" },
] as const;

export type FeedbackCategoryId = (typeof FEEDBACK_CATEGORY_OPTIONS)[number]["id"];

export const FEEDBACK_CATEGORY_IDS = new Set<string>(
  FEEDBACK_CATEGORY_OPTIONS.map((c) => c.id),
);
