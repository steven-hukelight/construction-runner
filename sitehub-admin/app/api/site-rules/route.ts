import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function cid(x: { company_id?: string | null }): string | null {
  return (x.company_id ?? null) as string | null;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const companyId = cookieStore.get("companyId")?.value;
    if (!companyId) return NextResponse.json({ rules: [] }, { status: 200 });

    const { data } = await supabaseAdmin
      .from("site_rules")
      .select("*")
      .eq("company_id", companyId);

    const rules = (data ?? []).map((r) => ({
      id: r.id,
      category: (r as Record<string, unknown>).category ?? "",
      title: (r as Record<string, unknown>).title ?? "",
      description: (r as Record<string, unknown>).body ?? "",
    }));
    return NextResponse.json({ rules });
  } catch (e) {
    console.error("GET /api/site-rules:", e);
    return NextResponse.json({ rules: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const cookieStore = await cookies();
  const companyId = cookieStore.get("companyId")?.value;
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
  const cookieStore = await cookies();
  const companyId = cookieStore.get("companyId")?.value;
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
  const cookieStore = await cookies();
  const companyId = cookieStore.get("companyId")?.value;
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from("site_rules").select("*").eq("id", id).single();
  if (!existing || cid(existing) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await supabaseAdmin.from("site_rules").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
