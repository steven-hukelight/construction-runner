import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendApprovalWelcomeEmailToUser } from "@/lib/sendApprovalWelcomeEmail";
import { findUserByIdOrEmail, findAuthUserIdByEmail, authUserExists } from "@/lib/auth/findUser";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canApproveRegistrations, classifySignupStatus, isApprovalQueueStatus } from "@/lib/signupRegistration";

export async function GET(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const roleLower = (auth.role ?? "").toLowerCase();
    if (!canApproveRegistrations(roleLower)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = (auth.companyId ?? "").trim();
    const { data } = await supabaseAdmin.from("registrations").select("id, company_id, data");
    const regs = (data ?? [])
      .filter((r) => isApprovalQueueStatus((r.data as { status?: string })?.status))
      .filter((r) => {
        const rowCid = r.company_id ? String(r.company_id).trim() : "";
        if (auth.isSuperuser || roleLower === "superuser") {
          return companyId ? rowCid === companyId : true;
        }
        return rowCid === companyId;
      })
      .map((r) => {
        const d = { ...((r.data as Record<string, unknown>) ?? {}) };
        delete d.emailOtpHash;
        delete d.emailOtpExpiresAt;
        delete d.emailOtpAttempts;
        delete d.emailLinkTokenHash;
        const status = typeof d.status === "string" ? d.status : "";
        return {
          id: r.id,
          ...d,
          companyId: d.companyId ?? r.company_id ?? null,
          needsEmailVerification: classifySignupStatus(status) === "unverified",
        };
      });
    return NextResponse.json(regs);
  } catch (err) {
    console.error("registrations GET error", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, role: roleFromBody, siteIds: siteIdsFromBody } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const actualApproverRole = (auth.role ?? "").toLowerCase();
    if (!canApproveRegistrations(actualApproverRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const effectiveApproverRole = actualApproverRole === "superuser" ? "SUPERUSER" : actualApproverRole.toUpperCase();

    const assignRoleUpper = String(roleFromBody ?? "OPERATIVE").toUpperCase();
    const requestedSiteIds = [
      ...new Set(
        (Array.isArray(siteIdsFromBody) ? siteIdsFromBody : [])
          .map((x: unknown) => String(x).trim())
          .filter(Boolean)
      ),
    ];

    if (assignRoleUpper === "ADMIN" || assignRoleUpper === "SUPERVISOR" || assignRoleUpper === "SITE_ADMIN") {
      if (effectiveApproverRole !== "ADMIN" && effectiveApproverRole !== "SUPERUSER") {
        return NextResponse.json({ error: "Only approved ADMIN or SUPERUSER can approve ADMIN/SUPERVISOR roles" }, { status: 403 });
      }
      if (assignRoleUpper === "SITE_ADMIN" || assignRoleUpper === "SUPERVISOR") {
        if (requestedSiteIds.length === 0) {
          return NextResponse.json({ error: "Select at least one site" }, { status: 400 });
        }
      }
    } else if (assignRoleUpper === "OPERATIVE") {
      if (
        effectiveApproverRole !== "ADMIN" &&
        effectiveApproverRole !== "SUPERVISOR" &&
        effectiveApproverRole !== "SUPERUSER" &&
        effectiveApproverRole !== "SUB_ADMIN"
      ) {
        return NextResponse.json({ error: "Only approved ADMIN/SUPERVISOR or SUPERUSER can approve OPERATIVE role" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Invalid role for approval" }, { status: 400 });
    }

    const { data: regRow } = await supabaseAdmin.from("registrations").select("id, company_id, data").eq("id", id).maybeSingle();
    if (!regRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const reg = regRow.data as {
      email?: string;
      name?: string;
      status?: string;
      role?: string;
      companyId?: string;
      emailVerified?: boolean;
      passwordSet?: boolean;
      authUserId?: string;
    };
    const effectiveCompanyId = regRow.company_id ?? reg.companyId ?? null;
    const statusKind = classifySignupStatus(reg.status);
    if (statusKind !== "pending" && statusKind !== "unverified") {
      return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }
    const awaitingEmail = statusKind === "unverified";

    let approvedSiteIds: string[] = [];
    if (assignRoleUpper === "SITE_ADMIN" || assignRoleUpper === "SUPERVISOR") {
      let siteQuery = supabaseAdmin.from("sites").select("id").in("id", requestedSiteIds);
      if (effectiveCompanyId) siteQuery = siteQuery.eq("company_id", effectiveCompanyId);
      const { data: allowedSites } = await siteQuery;
      approvedSiteIds = requestedSiteIds.filter((sid) =>
        (allowedSites ?? []).some((s) => String(s.id) === sid)
      );
      if (approvedSiteIds.length === 0) {
        return NextResponse.json({ error: "Select at least one site in this company" }, { status: 400 });
      }
    }

    const email = (reg.email ?? "").trim().toLowerCase();
    let authUser: { id: string } | null = null;
    let appliedTempPassword = false;
    let tempPassword: string | undefined;

    const candidateIds = [
      typeof reg.authUserId === "string" ? reg.authUserId.trim() : "",
      String((await findUserByIdOrEmail({ email }))?.id ?? "").trim(),
      (await findAuthUserIdByEmail(email)) ?? "",
    ].filter(Boolean);
    for (const id of candidateIds) {
      if (await authUserExists(id)) {
        authUser = { id };
        break;
      }
    }

    if (awaitingEmail && (!authUser || reg.passwordSet === false)) {
      return NextResponse.json(
        {
          error:
            "This person has not verified their email. Ask them to open the link in the signup email, then approve them.",
        },
        { status: 400 }
      );
    }

    if (!authUser && reg.passwordSet !== false) {
      return NextResponse.json(
        {
          error:
            "This applicant already chose a password, but their login could not be found. Ask them to sign up again with the same email so that password is saved. A temporary password will not be created.",
        },
        { status: 400 }
      );
    }

    if (!authUser) {
      tempPassword = Math.random().toString(36).slice(2, 10) + "!A1";
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: reg.name ?? undefined },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      authUser = created?.user ? { id: created.user.id } : null;
      appliedTempPassword = !!authUser;
    }


    if (!authUser) return NextResponse.json({ error: "Failed to create auth user" }, { status: 500 });

    const isCompanyAdmin = reg.role === "ADMIN" && reg.status === "COMPANY_ADMIN_PENDING";
    const approvedForApp = !isCompanyAdmin;
    const roleVal = assignRoleUpper.toLowerCase();

    await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      email_confirm: true,
      app_metadata: {
        approved: approvedForApp,
        role: roleVal,
        companyId: effectiveCompanyId,
        superuser: assignRoleUpper === "ADMIN" && reg.email?.endsWith?.("@construction-runner.com"),
      },
    });

    const { error: userWriteErr } = await supabaseAdmin.from("users").upsert(
      {
        id: authUser.id,
        email: (reg.email ?? "").trim().toLowerCase() || null,
        display_name: reg.name ?? "",
        company_id: effectiveCompanyId,
        role: roleVal,
        approved: approvedForApp,
      },
      { onConflict: "id" }
    );
    if (userWriteErr) {
      console.error("users upsert failed:", userWriteErr);
      return NextResponse.json({ error: userWriteErr.message }, { status: 500 });
    }

    await supabaseAdmin.from("user_sites").delete().eq("user_id", authUser.id);
    if ((assignRoleUpper === "SITE_ADMIN" || assignRoleUpper === "SUPERVISOR") && approvedSiteIds.length > 0) {
      const { error: sitesErr } = await supabaseAdmin.from("user_sites").insert(
        approvedSiteIds.map((site_id) => ({ user_id: authUser.id, site_id }))
      );
      if (sitesErr) {
        console.error("user_sites insert failed:", sitesErr);
        return NextResponse.json({ error: sitesErr.message }, { status: 500 });
      }
    }

    await supabaseAdmin
      .from("registrations")
      .update({
        data: {
          ...reg,
          companyId: effectiveCompanyId,
          status: isCompanyAdmin ? "ADMIN_SETUP_PENDING" : "APPROVED",
          emailVerified: true,
          approved_at: new Date().toISOString(),
          user_id: authUser.id,
          role: roleVal,
        },
      })
      .eq("id", id);

    try {
      await sendApprovalWelcomeEmailToUser(authUser.id, appliedTempPassword ? tempPassword : undefined);
    } catch (e) {
      console.error("welcome email failed", e);
    }

    const res = NextResponse.json({
      ok: true,
      ...(appliedTempPassword ? { tempPassword } : {}),
    });
    // Do NOT set role here – only setUserCookies (after login) may set the role cookie
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
