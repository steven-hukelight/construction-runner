import { NextResponse } from "next/server";

/** Retired. Live approvals use POST /api/auth/registrations. */
function gone() {
  return NextResponse.json({ error: "Gone" }, { status: 410 });
}

export async function GET() {
  return gone();
}

export async function POST() {
  return gone();
}
