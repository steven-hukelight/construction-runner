import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, companyName, companyCode } = body;
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const { data: settingsRow } = await supabaseAdmin
      .from("settings")
      .select("config")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();
    const cfg = (settingsRow?.config as Record<string, unknown>) ?? {};
    const featureToggles = (cfg?.featureToggles as Record<string, unknown>) ?? {};
    const registrationsOpen = featureToggles?.registrationsOpen ?? cfg?.featureA ?? true;
    if (registrationsOpen === false) {
      return NextResponse.json(
        { error: "Registrations are currently closed. Please try again later." },
        { status: 403 }
      );
    }

    let companyId: string | null = null;
    let companyDoc: { name?: string; invite_code?: string } | null = null;

    if (companyCode) {
      const { data } = await supabaseAdmin.from("companies").select("id, name, invite_code").eq("invite_code", companyCode).limit(1);
      if (!data?.length) return NextResponse.json({ error: "Invalid company code" }, { status: 400 });
      companyDoc = data[0];
      companyId = data[0].id;
    } else if (companyName) {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { data, error } = await supabaseAdmin.from("companies").insert({ name: companyName, invite_code: inviteCode }).select("id, name, invite_code").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      companyId = data.id;
      companyDoc = { name: data.name, invite_code: data.invite_code };
    } else {
      return NextResponse.json({ error: "Company name or code required" }, { status: 400 });
    }

    const { data: admins } = await supabaseAdmin.from("users").select("id").eq("company_id", companyId).eq("role", "admin");
    const isFirstAdmin = !admins?.length;

    const regStatus = isFirstAdmin ? "COMPANY_ADMIN_PENDING" : "PENDING";
    const regRole = isFirstAdmin ? "ADMIN" : "OPERATIVE";
    const { data: reg, error: regErr } = await supabaseAdmin
      .from("registrations")
      .insert({
        company_id: companyId,
        data: {
          email,
          name: name ?? null,
          companyName: companyDoc?.name ?? null,
          status: regStatus,
          role: regRole,
        },
      })
      .select("id")
      .single();

    if (regErr || !reg) return NextResponse.json({ error: "Registration failed" }, { status: 500 });

    let authUser: { id: string } | null = null;
    try {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name: name ?? undefined },
      });
      if (!error && created?.user) authUser = { id: created.user.id };
      else if (error?.message?.includes("already been registered")) {
        const { data: u } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle();
        if (u) authUser = { id: u.id };
      }
    } catch (e) {
      console.error("Failed to create Supabase Auth user", e);
    }

    if (authUser) {
      await supabaseAdmin.from("users").upsert(
        {
          id: authUser.id,
          email,
          display_name: name ?? "",
          company_id: companyId,
          role: isFirstAdmin ? "admin" : "operative",
        },
        { onConflict: "id" }
      );
    }

    const res = NextResponse.json({ id: reg.id, companyId, inviteCode: companyDoc?.invite_code }, { status: 201 });
    res.cookies.set("companyId", String(companyId), { path: "/", httpOnly: false });
    // Do NOT set role here – only setUserCookies (after login) may set the role cookie
    return res;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
