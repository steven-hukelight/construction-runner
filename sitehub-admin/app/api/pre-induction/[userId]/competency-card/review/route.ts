import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizeActingOnUser } from "@/lib/auth/actingOnUser";
import { canViewTeamAttendance } from "@/lib/auth/roles";
import { cardReview } from "@/lib/competence/service";

export const dynamic = "force-dynamic";

/** GET — the card's supervisor check and anything worth a second look (shared number, expired). Office only. */
export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const access = await authorizeActingOnUser(req, userId);
  if (!access.ok) return access.response;
  if (!canViewTeamAttendance(access.actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const review = await cardReview(access.targetUserId);
  return NextResponse.json({
    checkedAt: review.card?.checkedAt ?? null,
    checkedByName: review.checkedByName,
    flags: review.flags,
    canCheck: !access.isSelf,
  });
}

/** POST { checked: boolean } — a supervisor confirms the card details match the card, or takes that back. */
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const access = await authorizeActingOnUser(req, userId);
  if (!access.ok) return access.response;
  if (!canViewTeamAttendance(access.actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (access.isSelf) return NextResponse.json({ error: "Someone else must check your card" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { checked?: unknown } | null;
  if (typeof body?.checked !== "boolean") return NextResponse.json({ error: "checked must be true or false" }, { status: 400 });

  const { data: card } = await supabaseAdmin
    .from("pre_induction_competency_card")
    .select("user_id, card_number, file_url")
    .eq("user_id", access.targetUserId)
    .maybeSingle();
  if (!card) return NextResponse.json({ error: "No competency card saved yet" }, { status: 404 });
  if (body.checked && !String(card.card_number ?? "").trim() && !String(card.file_url ?? "").trim()) {
    return NextResponse.json({ error: "Add the card number or a photo first" }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from("pre_induction_competency_card")
    .update(
      body.checked
        ? { checked_at: new Date().toISOString(), checked_by: access.actor.uid }
        : { checked_at: null, checked_by: null },
    )
    .eq("user_id", access.targetUserId);
  if (error) {
    console.error("POST competency-card/review:", error.message);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
  const review = await cardReview(access.targetUserId);
  return NextResponse.json({
    checkedAt: review.card?.checkedAt ?? null,
    checkedByName: review.checkedByName,
    flags: review.flags,
    canCheck: true,
  });
}
