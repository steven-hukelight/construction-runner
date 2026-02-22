import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const uid = body.uid ?? body.userId;
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

    let { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("user_id", uid).maybeSingle();
    if (!profile) {
      const newId = crypto.randomUUID();
      const { data: newProfile } = await supabaseAdmin.from("profiles").insert({ id: newId, user_id: uid }).select("id").single();
      profile = newProfile ?? { id: newId };
    }
    const profileId = profile?.id;
    if (!profileId) return NextResponse.json({ error: "No profile for user" }, { status: 400 });

    const now = new Date();
    const inSixMonths = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30 * 6);

    const { data: cert } = await supabaseAdmin.from("profile_certifications").insert({
      profile_id: profileId,
      title: "CSCS Card",
      issuer: "CITB",
      issue_date: now.toISOString().slice(0, 10),
      expiry_date: inSixMonths.toISOString().slice(0, 10),
    }).select("id").single();

    const { data: train } = await supabaseAdmin.from("profile_training").insert({
      profile_id: profileId,
      title: "Manual Handling",
      issuer: "In-house",
      issue_date: now.toISOString().slice(0, 10),
    }).select("id").single();

    return NextResponse.json({
      success: true,
      certificationId: cert?.id,
      trainingId: train?.id,
    });
  } catch (e: unknown) {
    const err = e as Error;
    console.error("POST /api/dev/seed-cert-training failed:", err?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
