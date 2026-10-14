import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const SIGNUP_UNVERIFIED_STATUS = "EMAIL_UNVERIFIED";
export const SIGNUP_PENDING_STATUSES = ["PENDING", "COMPANY_ADMIN_PENDING"] as const;
export const SIGNUP_APPROVED_STATUSES = ["APPROVED", "ADMIN_SETUP_PENDING"] as const;

export type SignupRegData = {
  email?: string;
  name?: string | null;
  companyName?: string | null;
  companyId?: string | null;
  status?: string;
  pendingStatus?: string;
  role?: string;
  emailVerified?: boolean;
  emailOtpHash?: string;
  emailOtpExpiresAt?: string;
  emailOtpAttempts?: number;
  emailOtpLastSentAt?: string;
  emailLinkTokenHash?: string;
  passwordSet?: boolean;
  authUserId?: string;
  [key: string]: unknown;
};

export type SignupRegRow = {
  id: string;
  company_id: string | null;
  data: SignupRegData;
  created_at?: string;
};

export type SignupStatusKind = "unverified" | "pending" | "approved" | "rejected" | "other";

export function classifySignupStatus(status: string | null | undefined): SignupStatusKind {
  const s = (status ?? "").trim().toUpperCase();
  if (s === SIGNUP_UNVERIFIED_STATUS) return "unverified";
  if ((SIGNUP_PENDING_STATUSES as readonly string[]).includes(s)) return "pending";
  if ((SIGNUP_APPROVED_STATUSES as readonly string[]).includes(s)) return "approved";
  if (s === "REJECTED") return "rejected";
  return "other";
}

export function isPendingApprovalStatus(status: string | null | undefined): boolean {
  return classifySignupStatus(status) === "pending";
}

/** Rows an admin can act on: verified and waiting, or signed up but not yet verified. */
export function isApprovalQueueStatus(status: string | null | undefined): boolean {
  const kind = classifySignupStatus(status);
  return kind === "pending" || kind === "unverified";
}

export function signupOtpSentRecently(lastSentAt: string | null | undefined, withinMs = 60_000): boolean {
  if (!lastSentAt) return false;
  const last = new Date(lastSentAt).getTime();
  return Number.isFinite(last) && Date.now() - last < withinMs;
}

function asRegRow(row: {
  id: string;
  company_id?: string | null;
  data?: unknown;
  created_at?: string;
}): SignupRegRow {
  return {
    id: row.id,
    company_id: row.company_id ?? null,
    data: ((row.data ?? {}) as SignupRegData) ?? {},
    created_at: row.created_at,
  };
}

export async function findSignupsByEmail(email: string): Promise<SignupRegRow[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];
  const { data, error } = await supabaseAdmin
    .from("registrations")
    .select("id, company_id, data, created_at")
    .filter("data->>email", "eq", normalized)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("findSignupsByEmail:", error.message);
    return [];
  }
  return (data ?? []).map(asRegRow);
}

export async function findLatestSignupByEmail(email: string): Promise<SignupRegRow | null> {
  const rows = await findSignupsByEmail(email);
  return rows[0] ?? null;
}

export async function findUnverifiedSignupByEmail(email: string): Promise<SignupRegRow | null> {
  const rows = await findSignupsByEmail(email);
  return rows.find((r) => classifySignupStatus(r.data.status) === "unverified") ?? null;
}

export function withSignupOtp(
  data: SignupRegData,
  params: { otpHash: string; otpExpires: string; sentAt?: string; linkHash?: string }
): SignupRegData {
  const next: SignupRegData = {
    ...data,
    status: SIGNUP_UNVERIFIED_STATUS,
    emailVerified: false,
    emailOtpHash: params.otpHash,
    emailOtpExpiresAt: params.otpExpires,
    emailOtpAttempts: 0,
    ...(params.sentAt ? { emailOtpLastSentAt: params.sentAt } : {}),
  };
  if (params.linkHash) next.emailLinkTokenHash = params.linkHash;
  return next;
}

export function canApproveRegistrations(role: string | null | undefined): boolean {
  const r = (role ?? "").toLowerCase();
  return r === "superuser" || r === "admin" || r === "supervisor" || r === "sub_admin";
}
