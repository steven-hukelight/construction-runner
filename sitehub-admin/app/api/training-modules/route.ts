import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { myTraining } from "@/lib/training/service";

export const dynamic = "force-dynamic";

/** The caller's Training screen: modules the company has switched on, face fit, live campaigns. `?count=due` for the home badge. */
export async function GET(req: Request) {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return auth;
  const countOnly = new URL(req.url).searchParams.get("count") === "due";
  const companyId = (auth.companyId ?? "").trim();
  if (!auth.uid || !companyId) {
    return NextResponse.json(countOnly ? { count: 0 } : { modules: [], faceFit: null, campaigns: [], dueCount: 0 });
  }
  try {
    const training = await myTraining(auth.uid, companyId);
    if (countOnly) return NextResponse.json({ count: training.dueCount });
    return NextResponse.json(training);
  } catch (e) {
    console.error("GET /api/training-modules:", e);
    return NextResponse.json({ error: "Couldn't load training" }, { status: 500 });
  }
}
