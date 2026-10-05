import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";

export type PreInductionAuth = {
  uid: string | null;
  role: string | null;
  companyId: string | null;
  userEmail: string | null;
};

const NO_AUTH: PreInductionAuth = { uid: null, role: null, companyId: null, userEmail: null };

/**
 * Verified caller identity for pre-induction and attendance routes: a valid `session_id`
 * (web dashboard) or Supabase Bearer token (mobile app). Returns all-null fields when neither
 * verifies. Never takes the user id from the request body or query string.
 */
export async function resolvePreInductionAuth(params: { req: Request }): Promise<PreInductionAuth> {
  const auth = await resolveMobileApiAuth(params.req);
  if (auth instanceof NextResponse) return NO_AUTH;
  return {
    uid: auth.uid,
    role: auth.role,
    companyId: auth.companyId,
    userEmail: auth.userEmail,
  };
}
