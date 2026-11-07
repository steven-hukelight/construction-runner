import { NextResponse } from "next/server";
import { resolveMobileApiAuth, type MobileApiAuth } from "@/app/api/_utils/mobileAuth";
import {
  canAssignOperativesToSites,
  canEditCompanySafetyPack,
  canViewTeamAttendance,
  isPlatformSuperuser,
} from "@/lib/auth/roles";

export type TrainingOfficeAuth = MobileApiAuth & {
  companyId: string;
  /** Switch modules on or off and set the refresh period. */
  canConfigure: boolean;
  /** Log face fit results and post campaign cards. */
  canRecord: boolean;
  /** Attach a video or publisher link to a catalogue module. Platform only. */
  canEditCatalogue: boolean;
};

/** Office staff for one company. Operatives get 403. */
export async function resolveTrainingOfficeAuth(req: Request): Promise<TrainingOfficeAuth | NextResponse> {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!canViewTeamAttendance(auth.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const companyId = (auth.companyId ?? "").trim();
  if (!companyId) return NextResponse.json({ error: "Select a company first" }, { status: 400 });
  return {
    ...auth,
    companyId,
    canConfigure: canEditCompanySafetyPack(auth.role),
    canRecord: canAssignOperativesToSites(auth.role),
    canEditCatalogue: isPlatformSuperuser(auth.role),
  };
}
