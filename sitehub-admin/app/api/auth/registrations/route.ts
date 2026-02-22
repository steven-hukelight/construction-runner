import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    const companyId = cookieStore.get("companyId")?.value?.trim() ?? null;

    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const roleLower = role.toLowerCase();
    if (roleLower !== "superuser" && roleLower !== "admin" && roleLower !== "supervisor" && roleLower !== "sub_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data } = await supabaseAdmin.from("registrations").select("id, data");
    const regs = (data ?? [])
      .filter((r) => ((r.data as { status?: string })?.status ?? "") === "PENDING" || ((r.data as { status?: string })?.status ?? "") === "COMPANY_ADMIN_PENDING")
      .filter((r) => {
        if (role === "superuser") return true;
        const regData = r.data as { companyId?: string };
        return (regData?.companyId ?? "") === (companyId ?? "");
      })
      .map((r) => ({ id: r.id, ...(r.data as object) }));
    return NextResponse.json(regs);
  } catch (err) {
    console.error("registrations GET error", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, role } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const cookieStore = await cookies();
    const actualApproverRole = (cookieStore.get("role")?.value ?? "").toLowerCase();
    if (!actualApproverRole) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const effectiveApproverRole = actualApproverRole === "superuser" ? "SUPERUSER" : actualApproverRole.toUpperCase();

    if (role === "ADMIN" || role === "SUPERVISOR") {
      if (effectiveApproverRole !== "ADMIN" && effectiveApproverRole !== "SUPERUSER") {
        return NextResponse.json({ error: "Only approved ADMIN or SUPERUSER can approve ADMIN/SUPERVISOR roles" }, { status: 403 });
      }
    } else if (role === "OPERATIVE") {
      if (effectiveApproverRole !== "ADMIN" && effectiveApproverRole !== "SUPERVISOR" && effectiveApproverRole !== "SUPERUSER") {
        return NextResponse.json({ error: "Only approved ADMIN/SUPERVISOR or SUPERUSER can approve OPERATIVE role" }, { status: 403 });
      }
    }

    const { data: regRow } = await supabaseAdmin.from("registrations").select("id, data").eq("id", id).maybeSingle();
    if (!regRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const reg = regRow.data as { email?: string; name?: string; status?: string; role?: string; companyId?: string };
    if (reg.status !== "PENDING" && reg.status !== "COMPANY_ADMIN_PENDING") {
      return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }

    const tempPassword = Math.random().toString(36).slice(2, 10) + "!A1";
    let authUser: { id: string } | null = null;

    const { data: existingUser } = await supabaseAdmin.from("users").select("id").eq("email", reg.email ?? "").maybeSingle();
    if (existingUser) {
      authUser = { id: existingUser.id };
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: reg.email ?? "",
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: reg.name ?? undefined },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      authUser = created?.user ? { id: created.user.id } : null;
    }


    if (!authUser) return NextResponse.json({ error: "Failed to create auth user" }, { status: 500 });

    const isCompanyAdmin = reg.role === "ADMIN" && reg.status === "COMPANY_ADMIN_PENDING";
    const approved = !isCompanyAdmin;
    const roleVal = (role ?? "operative").toLowerCase();

    await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      app_metadata: {
        approved,
        role: roleVal,
        companyId: reg.companyId ?? null,
        superuser: (role === "ADMIN" || role === "SUPERUSER") && reg.email?.endsWith?.("@sitehub.com"),
      },
    });

    await supabaseAdmin.from("users").upsert(
      {
        id: authUser.id,
        email: reg.email ?? null,
        display_name: reg.name ?? "",
        company_id: reg.companyId ?? null,
        role: roleVal,
      },
      { onConflict: "id" }
    );

    await supabaseAdmin
      .from("registrations")
      .update({
        data: {
          ...reg,
          status: isCompanyAdmin ? "ADMIN_SETUP_PENDING" : "APPROVED",
          approved_at: new Date().toISOString(),
          user_id: authUser.id,
          role: roleVal,
        },
      })
      .eq("id", id);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/auth/sendWelcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUser.id, tempPassword }),
      });
    } catch (e) {
      console.error("welcome email failed", e);
    }

    try {
      const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      await fetch(`${base.replace(/\/$/, "")}/api/auth/send-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: reg.email }),
      });
    } catch (e) {
      console.error("auto password reset email failed", e);
    }

    const res = NextResponse.json({ ok: true, tempPassword });
    // Do NOT set role here – only setUserCookies (after login) may set the role cookie
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
