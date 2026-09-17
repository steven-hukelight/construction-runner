import { NextResponse } from "next/server";
import { POST as loginPost } from "../login/route";

/** NextAuth is retired. POST .../login still aliases the real login handler. */
function gone() {
  return NextResponse.json({ error: "Gone" }, { status: 410 });
}

export async function GET() {
  return gone();
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ nextauth?: string[] }> }
) {
  const params = await ctx.params;
  if (params.nextauth?.[0] === "login") {
    return loginPost(req);
  }
  return gone();
}
