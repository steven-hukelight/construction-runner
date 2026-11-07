import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTrainingOfficeAuth } from "@/lib/training/officeAuth";
import { isHttpsUrl } from "@/lib/utils/httpsUrl";
import type { CampaignRow } from "@/lib/training/service";

export const dynamic = "force-dynamic";

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

/** Campaign cards with how many people have acknowledged each. */
export async function GET(req: Request) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { data, error } = await supabaseAdmin
    .from("training_campaigns")
    .select("id, company_id, title, summary, url, publisher, starts_on, ends_on, created_at")
    .eq("company_id", auth.companyId)
    .order("ends_on", { ascending: false })
    .limit(200);
  if (error) {
    console.error("GET /api/training-admin/campaigns:", error);
    return NextResponse.json({ error: "Couldn't load campaigns" }, { status: 500 });
  }
  const rows = (data ?? []) as CampaignRow[];
  const { data: acks } = rows.length
    ? await supabaseAdmin.from("training_campaign_acks").select("campaign_id").in("campaign_id", rows.map((r) => r.id))
    : { data: [] };
  const counts = new Map<string, number>();
  for (const a of acks ?? []) counts.set(String(a.campaign_id), (counts.get(String(a.campaign_id)) ?? 0) + 1);
  return NextResponse.json({ campaigns: rows.map((r) => ({ ...r, acknowledged_count: counts.get(r.id) ?? 0 })) });
}

/** `{ title, url, publisher?, summary?, startsOn, endsOn }` */
export async function POST(req: Request) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.canRecord) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim().slice(0, 140);
  const url = String(body.url ?? "").trim();
  const publisher = String(body.publisher ?? "").trim().slice(0, 80) || null;
  const summary = String(body.summary ?? "").trim().slice(0, 500) || null;
  const startsOn = String(body.startsOn ?? "").trim();
  const endsOn = String(body.endsOn ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!isHttpsUrl(url)) return NextResponse.json({ error: "The link must start with https://" }, { status: 400 });
  if (!isDateOnly(startsOn) || !isDateOnly(endsOn)) return NextResponse.json({ error: "Enter a start and end date" }, { status: 400 });
  if (endsOn < startsOn) return NextResponse.json({ error: "The end date must be after the start date" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("training_campaigns")
    .insert({
      company_id: auth.companyId,
      title,
      url,
      publisher,
      summary,
      starts_on: startsOn,
      ends_on: endsOn,
      created_by: auth.uid,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("POST /api/training-admin/campaigns:", error);
    return NextResponse.json({ error: "Couldn't save the campaign" }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
