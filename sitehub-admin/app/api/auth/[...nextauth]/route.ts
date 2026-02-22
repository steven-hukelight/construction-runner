import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { POST as loginPost } from "../login/route";

const handler = NextAuth(authOptions);

export async function GET(req: Request, ctx: { params: Promise<{ nextauth?: string[] }> }) {
  return handler(req, ctx as never);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ nextauth?: string[] }> }
) {
  const params = await ctx.params;
  if (params.nextauth?.[0] === "login") {
    return loginPost(req);
  }
  return handler(req, ctx as never);
}
