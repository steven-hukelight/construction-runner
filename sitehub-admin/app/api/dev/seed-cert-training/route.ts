import { NextResponse } from "next/server";

/** Retired. Do not seed fake CSCS/training onto live profiles. */
function gone() {
  return NextResponse.json({ error: "Gone" }, { status: 410 });
}

export async function GET() {
  return gone();
}

export async function POST() {
  return gone();
}
