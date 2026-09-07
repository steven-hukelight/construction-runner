import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerPublicOrigin } from "@/lib/url";

/**
 * GET /api/companies
 * List all companies (superuser only). Includes userCount and siteCount.
 * Auth: role cookie or user_email fallback (mobile may not always send role cookie).
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    let role = cookieStore.get("role")?.value;
    // Fallback for mobile: verify superuser via user lookup when role cookie missing
    if (role !== "superuser") {
      const userEmail = cookieStore.get("user_email")?.value?.trim();
      if (userEmail) {
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("role")
          .eq("email", userEmail)
          .maybeSingle();
        if (user?.role && String(user.role).toLowerCase() === "superuser") {
          role = "superuser";
        }
      }
    }
    if (role !== "superuser") {
      return NextResponse.json([]);
    }

    const { data: companies, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("GET /api/companies Supabase error:", error);
      return NextResponse.json([], { status: 200 });
    }

    const ids = (companies ?? []).map((c) => c.id);
    if (ids.length === 0) return NextResponse.json([]);

    const [usersRes, sitesRes] = await Promise.all([
      supabaseAdmin.from("users").select("company_id").in("company_id", ids),
      supabaseAdmin.from("sites").select("company_id").in("company_id", ids),
    ]);
    const userCountByCo: Record<string, number> = {};
    const siteCountByCo: Record<string, number> = {};
    for (const id of ids) {
      userCountByCo[id] = 0;
      siteCountByCo[id] = 0;
    }
    for (const r of usersRes.data ?? []) {
      const cid = (r as { company_id: string }).company_id;
      if (cid) userCountByCo[cid] = (userCountByCo[cid] ?? 0) + 1;
    }
    for (const r of sitesRes.data ?? []) {
      const cid = (r as { company_id: string }).company_id;
      if (cid) siteCountByCo[cid] = (siteCountByCo[cid] ?? 0) + 1;
    }

    const result = (companies ?? []).map((c) => {
      const createdAt = c.created_at;
      return {
        id: c.id,
        name: c.name ?? null,
        inviteCode: null,
        createdAt: createdAt ? new Date(createdAt).toISOString() : null,
        status: "Active",
        userCount: userCountByCo[c.id] ?? 0,
        siteCount: siteCountByCo[c.id] ?? 0,
      };
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/companies failed:", message);
    return NextResponse.json([], { status: 200 });
  }
}

const emailLooksValid = (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());

/**
 * POST /api/companies
 * Create a new company (superuser only) and provision the first admin with a temporary password emailed to them.
 *
 * Body: requesteeName, name, contactEmail, address (all required).
 */
export async function POST(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const requesteeName = String(body.requesteeName ?? "").trim();
    const name = String(body.name ?? "").trim();
    const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase();
    const address = String(body.address ?? "").trim();

    if (!requesteeName) {
      return NextResponse.json({ error: "Requestee name is required" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }
    if (!contactEmail || !emailLooksValid(contactEmail)) {
      return NextResponse.json({ error: "A valid access email address is required" }, { status: 400 });
    }
    if (!address) {
      return NextResponse.json({ error: "Company address is required" }, { status: 400 });
    }

    const { data: existingUser } = await supabaseAdmin.from("users").select("id").eq("email", contactEmail).maybeSingle();
    if (existingUser) {
      return NextResponse.json(
        { error: "That email is already registered. Use a different access email or remove the existing user first." },
        { status: 400 }
      );
    }

    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const companyId = crypto.randomUUID();
    const tempPassword = Math.random().toString(36).slice(2, 10) + "!A1";

    const { data: companyRow, error: insertErr } = await supabaseAdmin
      .from("companies")
      .insert({
        id: companyId,
        name,
        invite_code: inviteCode,
        address,
        primary_contact_name: requesteeName,
      })
      .select("id")
      .single();

    if (insertErr || !companyRow) {
      console.error("POST /api/companies Supabase error:", insertErr);
      return NextResponse.json({ error: insertErr?.message ?? "Could not create company" }, { status: 500 });
    }

    const { data: createdAuth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: contactEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: requesteeName },
      app_metadata: {
        approved: true,
        role: "admin",
        companyId,
      },
    });

    if (authErr || !createdAuth?.user) {
      await supabaseAdmin.from("companies").delete().eq("id", companyId);
      const msg = authErr?.message ?? "Could not create access account";
      if (msg.toLowerCase().includes("already")) {
        return NextResponse.json({ error: "That email is already in use in authentication." }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const authUserId = createdAuth.user.id;

    try {
      const { error: userRowErr } = await supabaseAdmin.from("users").upsert(
        {
          id: authUserId,
          email: contactEmail,
          display_name: requesteeName,
          company_id: companyId,
          role: "admin",
          approved: true,
        },
        { onConflict: "id" }
      );

      if (userRowErr) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        await supabaseAdmin.from("companies").delete().eq("id", companyId);
        console.error("POST /api/companies users upsert:", userRowErr);
        return NextResponse.json({ error: userRowErr.message }, { status: 500 });
      }
    } catch (e) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
      await supabaseAdmin.from("companies").delete().eq("id", companyId);
      throw e;
    }

    try {
      const base = getServerPublicOrigin();
      await fetch(`${base.replace(/\/$/, "")}/api/auth/sendWelcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUserId, tempPassword }),
      });
    } catch (e) {
      console.error("POST /api/companies welcome email failed:", e);
    }

    return NextResponse.json(
      {
        id: companyId,
        name,
        inviteCode,
        status: "Active",
        message: "Company created. A welcome email with a temporary password was sent to the access email (if email is configured).",
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/companies failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
