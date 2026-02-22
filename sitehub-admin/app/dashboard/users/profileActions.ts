"use server";

import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/url";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchProfiles() {
  const base = getBaseUrl();
  const url = `${base}/api/profiles`;
  const headers: HeadersInit = { "Cache-Control": "no-store" };
  const cookieHeader = (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  if (cookieHeader) headers.Cookie = cookieHeader;
  const res = await fetch(url, { cache: "no-store", headers });
  if (!res.ok) return [];
  return res.json();
}

export async function updateProfile(id: string, data: any) {
  const base = getBaseUrl();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const cookieHeader = (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  if (cookieHeader) headers.Cookie = cookieHeader;
  const body = { ...data, userId: data.userId ?? id };
  const res = await fetch(`${base}/api/profiles`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update profile");
  }
  return res.json();
}
