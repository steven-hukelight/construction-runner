import { NextResponse } from "next/server";
import { authCookieClearOptions } from "@/lib/authCookies";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("impersonating", "", authCookieClearOptions());
  res.cookies.set("companyId", "", authCookieClearOptions());
  return res;
}
