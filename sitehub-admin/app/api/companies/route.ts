import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET /api/companies Supabase error:", error);
      return NextResponse.json([], { status: 200 });
    }

    const result = await Promise.all(
      (companies ?? []).map(async (c) => {
        const id = c.id;
        let userCount = 0;
        let siteCount = 0;
        try {
          const [usersRes, sitesRes] = await Promise.all([
            supabaseAdmin.from("users").select("id").eq("company_id", id),
            supabaseAdmin.from("sites").select("id").eq("company_id", id),
          ]);
          userCount = usersRes.data?.length ?? 0;
          siteCount = sitesRes.data?.length ?? 0;
        } catch {
          // ignore count errors
        }
        const createdAt = c.created_at;
        return {
          id,
          name: c.name ?? null,
          inviteCode: null,
          createdAt: createdAt ? new Date(createdAt).toISOString() : null,
          status: "Active",
          userCount,
          siteCount,
        };
      })
    );

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/companies failed:", message);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/companies
 * Create a new company (superuser only).
 */
export async function POST(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data, error } = await supabaseAdmin
      .from("companies")
      .insert({
        id: crypto.randomUUID(),
        name,
      })
      .select("id")
      .single();

    if (error) {
      console.error("POST /api/companies Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: data?.id,
        name,
        inviteCode,
        status: "Active",
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/companies failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
