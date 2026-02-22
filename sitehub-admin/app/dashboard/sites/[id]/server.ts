"use server";

import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/url";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchSite(id: string): Promise<any> {
  const base = getBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const res = await fetch(`${base}/api/sites/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    const msg = text ? `${res.status}: ${text}` : `HTTP ${res.status}`;
    throw new Error(`Failed to load site (${msg})`);
  }

  return res.json();
}
