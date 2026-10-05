/**
 * POST /api/induction/complete
 * Marks a site induction as completed for the current user.
 * Self-complete requires safety / RAMS / rules steps to be recorded.
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { getInductionProgress } from "@/lib/induction/inductionProgress";

export async function POST(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const uid = auth.uid;
    const role = (auth.role ?? "").toLowerCase();

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = (body.userId ?? body.user_id)?.toString()?.trim();
    const siteId = (body.siteId ?? body.site_id)?.toString()?.trim();

    if (!userId || !siteId) {
      return NextResponse.json(
        { error: "userId and siteId required" },
        { status: 400 }
      );
    }

    const isSelf = userId === uid;
    const isAdmin =
      role === "superuser" ||
      role === "admin" ||
      role === "supervisor" ||
      role === "site_admin";

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isSelf) {
      const progress = await getInductionProgress({
        userId,
        siteId,
        companyId: auth.companyId,
        ensureSafetyCopy: false,
      });
      if (!progress) {
        return NextResponse.json({ error: "Site not found" }, { status: 404 });
      }
      if (!progress.canComplete) {
        return NextResponse.json(
          {
            error: "induction_steps_incomplete",
            message: "Read safety information, sign RAMS (or confirm already signed), and accept site rules before completing induction.",
          },
          { status: 400 },
        );
      }
    }

    const { error } = await supabaseAdmin.from("user_site_inductions").upsert(
      {
        user_id: userId,
        site_id: siteId,
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,site_id" }
    );

    if (error) {
      console.error("Induction complete failed:", error);
      return NextResponse.json({ error: "Failed to complete induction" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/induction/complete:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
