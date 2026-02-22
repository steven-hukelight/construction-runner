import { NextResponse } from "next/server";

export async function POST() {
  // Clear impersonating and companyId cookies
  const res = NextResponse.json({ ok: true });
  res.cookies.set("impersonating", "", { path: "/", maxAge: 0 });
  res.cookies.set("companyId", "", { path: "/", maxAge: 0 });
  return res;
}
