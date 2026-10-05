import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/app-version
 * Public. Lowest mobile build number still allowed to run.
 * Set ANDROID_MIN_BUILD_NUMBER (e.g. "30") to force older Android installs to update via Google Play.
 */
export async function GET() {
  const parsed = Number.parseInt(process.env.ANDROID_MIN_BUILD_NUMBER ?? "", 10);
  const androidMinBuild = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

  return NextResponse.json(
    { androidMinBuild },
    { headers: { "Cache-Control": "no-store" } }
  );
}
