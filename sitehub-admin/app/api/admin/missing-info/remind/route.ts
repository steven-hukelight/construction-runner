/**
 * POST /api/admin/missing-info/remind
 * Body: { userId: string } | { userIds: string[] }
 * Sends push (+ email when configured) asking the worker to complete My Info.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { sendPushToUsers } from "@/lib/onesignal";
import { sendPlainEmail } from "@/lib/sendPlainEmail";
import { getServerPublicOrigin } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    if (!["admin", "supervisor", "superuser", "site_admin", "sub_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let companyId =
      cookieStore.get("companyId")?.value?.trim() ||
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) ||
      "";

    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      userIds?: string[];
    };
    const ids = [
      ...new Set(
        [
          ...(Array.isArray(body.userIds) ? body.userIds : []),
          body.userId ? String(body.userId) : "",
        ]
          .map((x) => String(x).trim())
          .filter(Boolean),
      ),
    ];
    if (ids.length === 0) {
      return NextResponse.json({ error: "userId or userIds required" }, { status: 400 });
    }
    if (ids.length > 50) {
      return NextResponse.json({ error: "Max 50 recipients per request" }, { status: 400 });
    }

    let q = supabaseAdmin
      .from("users")
      .select("id, email, display_name, company_id, role")
      .in("id", ids);
    if (role !== "superuser" && companyId) {
      q = q.eq("company_id", companyId);
    }
    const { data: users, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const list = users ?? [];
    if (list.length === 0) {
      return NextResponse.json({ error: "No matching users" }, { status: 404 });
    }

    const origin = getServerPublicOrigin();
    const title = "Complete your profile info";
    const pushBody =
      "Please update your emergency contact and medical info in the Construction Runner app.";
    const emailSubject = "Action needed: complete your Construction Runner profile";

    const push = await sendPushToUsers(
      list.map((u) => String(u.id)),
      title,
      pushBody,
      { type: "missing_info_reminder", screen: "profile" },
    );

    let emailed = 0;
    let emailFailed = 0;
    for (const u of list) {
      const email = String((u as { email?: string }).email ?? "").trim();
      if (!email) continue;
      const name =
        String((u as { display_name?: string }).display_name ?? "").trim() ||
        email.split("@")[0];
      const text = [
        `Hi ${name},`,
        "",
        "Your profile is missing required information (emergency contact and/or medical info).",
        "Please open Construction Runner and complete My Info as soon as you can.",
        "",
        origin ? `Web: ${origin}/dashboard/profile` : "",
        "",
        "Thanks,",
        "Construction Runner",
      ]
        .filter(Boolean)
        .join("\n");
      const result = await sendPlainEmail(email, emailSubject, text);
      if (result.ok) emailed += 1;
      else emailFailed += 1;
    }

    return NextResponse.json({
      success: true,
      recipients: list.length,
      pushSent: Boolean(push.sent),
      pushError: push.error ?? null,
      emailed,
      emailFailed,
    });
  } catch (e) {
    console.error("[api/admin/missing-info/remind] POST failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
