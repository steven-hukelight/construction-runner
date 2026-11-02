"use server";

import { callRoute, callRouteList } from "@/lib/server/callRoute";
import { GET as getProfiles, PATCH as patchProfile } from "@/app/api/profiles/route";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchProfiles() {
  return callRouteList(getProfiles, "/api/profiles");
}

export async function updateProfile(id: string, data: any) {
  const res = await callRoute(patchProfile, "/api/profiles", { method: "PATCH", body: { ...data, userId: data.userId ?? id } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update profile");
  }
  return res.json();
}
