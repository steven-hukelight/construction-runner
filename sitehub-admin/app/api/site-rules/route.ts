import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";

function cid(x: { company_id?: string | null }): string | null {
  return (x.company_id ?? null) as string | null;
}

export async function GET(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    const url = new URL(req.url);
    const companyId = auth.companyId;
    const category = url.searchParams.get("category")?.trim();
    const search = url.searchParams.get("search")?.trim().toLowerCase();
    const favouriteOnly = url.searchParams.get("favouriteOnly") === "true";
    const sort = url.searchParams.get("sort") || "category";

    if (!companyId) return NextResponse.json({ rules: [] }, { status: 200 });

    let query = supabaseAdmin
      .from("site_rules")
      .select("*")
      .eq("company_id", companyId);
    if (category) query = query.eq("category", category);

    const { data } = await query;

    const rulesRaw = (data ?? []).filter((rule) => {
      if (!search) return true;
      const haystack = [
        (rule as Record<string, unknown>).category ?? "",
        (rule as Record<string, unknown>).title ?? "",
        (rule as Record<string, unknown>).body ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });

    const ruleIds = rulesRaw.map((rule) => rule.id);
    let favouriteIds = new Set<string>();
    if (auth.uid && ruleIds.length > 0) {
      const { data: favourites } = await supabaseAdmin
        .from("site_rule_favourites")
        .select("site_rule_id")
        .eq("user_id", auth.uid)
        .in("site_rule_id", ruleIds);
      favouriteIds = new Set(
        (favourites ?? [])
          .map((row) => row.site_rule_id?.toString() ?? "")
          .filter(Boolean),
      );
    }

    let rules = rulesRaw.map((r) => ({
      id: r.id,
      category: (r as Record<string, unknown>).category ?? "",
      title: (r as Record<string, unknown>).title ?? "",
      description: (r as Record<string, unknown>).body ?? "",
      file_url: (r as Record<string, unknown>).file_url ?? "",
      updated_at: (r as Record<string, unknown>).updated_at ?? null,
      is_favourite: auth.uid ? favouriteIds.has(r.id) : false,
    }));

    if (favouriteOnly) {
      rules = rules.filter((rule) => rule.is_favourite);
    }

    rules.sort((a, b) => {
      if (sort === "title") {
        return String(a.title).localeCompare(String(b.title));
      }
      if (sort === "updated") {
        return String(b.updated_at ?? "").localeCompare(
          String(a.updated_at ?? ""),
        );
      }
      if (sort === "favourites") {
        if (a.is_favourite === b.is_favourite) {
          return String(a.title).localeCompare(String(b.title));
        }
        return a.is_favourite ? -1 : 1;
      }
      const categoryCompare = String(a.category).localeCompare(
        String(b.category),
      );
      if (categoryCompare !== 0) return categoryCompare;
      return String(a.title).localeCompare(String(b.title));
    });
    return NextResponse.json({ rules });
  } catch (e) {
    console.error("GET /api/site-rules:", e);
    return NextResponse.json({ rules: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const auth = await resolveMobileApiAuth(req);
  const companyId = auth.companyId;
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { category, title, description } = body;
  if (!category || !title) return NextResponse.json({ error: "category and title required" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("site_rules").insert({
    company_id: companyId,
    category,
    title: String(title),
    body: String(description ?? ""),
  }).select("id, category, title, body").single();

  if (error) {
    console.error("POST /api/site-rules failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rule = { id: data?.id, category: data?.category, title: data?.title, description: data?.body };
  return NextResponse.json({ rule });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const auth = await resolveMobileApiAuth(req);
  const companyId = auth.companyId;
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { id, category, title, description } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from("site_rules").select("*").eq("id", id).single();
  if (!existing || cid(existing) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const update: Record<string, unknown> = {};
  if (category != null) update.category = category;
  if (title != null) update.title = title;
  if (description != null) update.body = description;
  if (Object.keys(update).length > 0) {
    await supabaseAdmin.from("site_rules").update(update).eq("id", id);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const auth = await resolveMobileApiAuth(req);
  const companyId = auth.companyId;
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from("site_rules").select("*").eq("id", id).single();
  if (!existing || cid(existing) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await supabaseAdmin.from("site_rules").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
