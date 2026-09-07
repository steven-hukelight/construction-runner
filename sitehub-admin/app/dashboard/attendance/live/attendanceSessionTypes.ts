export type TimestampLike = { toDate?: () => Date } | string | number | Date;

export type AttendanceLog = {
  id: string;
  timestamp?: TimestampLike;
  created_at?: TimestampLike;
  createdAt?: TimestampLike;
  name?: string;
  displayName?: string;
  userName?: string;
  operativeName?: string;
  operativeId?: string;
  userId?: string;
  user_id?: string;
  uid?: string;
  companyId?: string;
  company_id?: string;
  siteName?: string;
  siteId?: string;
  site_id?: string;
  site?: { id?: string; name?: string } | null;
  action?: string;
  notes?: string;
  exit_time?: string;
  exitTime?: string;
  exit_time_millis?: number;
  exitTimeMillis?: number;
  sign_out_time?: string;
  signOutTime?: string;
  auto_sign_out_reason?: string;
  autoSignOutReason?: string;
  auto_sign_out?: boolean;
  autoSignOut?: boolean;
};

export type AttendanceSessionKind = "work_session" | "absent" | "orphan_sign_out";

/** One grouped row in the live attendance table */
export type AttendanceSession = {
  id: string;
  kind: AttendanceSessionKind;
  userId: string;
  signInLog: AttendanceLog | null;
  signOutLog: AttendanceLog | null;
  /** Set when kind === "absent" */
  absentLog: AttendanceLog | null;
};

export type ExitReasonKind = "auto" | "manual" | "server_check";
