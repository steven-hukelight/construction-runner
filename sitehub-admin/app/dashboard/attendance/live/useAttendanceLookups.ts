"use client";

import { useEffect, useState } from "react";

export type AttendanceUser = {
  id: string;
  name?: string;
  display_name?: string;
  email?: string;
  displayName?: string;
  company_id?: string;
  companyId?: string;
};
export type AttendanceProfile = { id?: string; userId?: string; displayName?: string };
export type AttendanceSite = { id: string; name?: string };

export type AttendanceLookups = {
  users: AttendanceUser[];
  sites: AttendanceSite[];
  profiles: AttendanceProfile[];
  companyMap: Record<string, string>;
};

export const EMPTY_ATTENDANCE_LOOKUPS: AttendanceLookups = { users: [], sites: [], profiles: [], companyMap: {} };

const asString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
};

const normalizeUser = (value: unknown): AttendanceUser | null => {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const id = asString(obj.id);
  if (!id) return null;
  return {
    id,
    name: asString(obj.name),
    display_name: asString(obj.display_name),
    displayName: asString(obj.displayName),
    email: asString(obj.email),
    company_id: asString(obj.company_id),
    companyId: asString(obj.companyId),
  };
};

const normalizeProfile = (value: unknown): AttendanceProfile | null => {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const pid = asString(obj.id ?? obj.userId);
  if (!pid) return null;
  return {
    id: pid,
    userId: asString(obj.userId),
    displayName: asString(obj.displayName ?? obj.display_name),
  };
};

const normalizeSite = (value: unknown): AttendanceSite | null => {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const id = asString(obj.id);
  if (!id) return null;
  return { id, name: asString(obj.name) };
};

function listOf<T>(value: unknown, normalize: (v: unknown) => T | null): T[] {
  return Array.isArray(value) ? (value.map(normalize).filter(Boolean) as T[]) : [];
}

async function jsonOrNull(res: Response): Promise<unknown> {
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

/** Users, sites, profiles and company names for labelling attendance rows. Loaded once per mount. */
export function useAttendanceLookups(): AttendanceLookups {
  const [lookups, setLookups] = useState<AttendanceLookups>(EMPTY_ATTENDANCE_LOOKUPS);

  useEffect(() => {
    const ac = new AbortController();
    const opts: RequestInit = { cache: "no-store", credentials: "include", signal: ac.signal };
    void (async () => {
      try {
        const responses = await Promise.all(
          ["/api/users", "/api/sites", "/api/profiles", "/api/companies", "/api/me"].map((url) => fetch(url, opts)),
        );
        const [usersJson, sitesJson, profilesJson, companiesJson, meJson] = await Promise.all(responses.map(jsonOrNull));
        const companyMap: Record<string, string> = {};
        if (Array.isArray(companiesJson)) {
          for (const c of companiesJson as { id?: string; name?: string }[]) {
            if (c?.id && c?.name) companyMap[String(c.id)] = String(c.name);
          }
        }
        const me = (meJson ?? {}) as { companyId?: string; company_id?: string; companyName?: string };
        const meCid = me.companyId ?? me.company_id;
        if (meCid && me.companyName && String(me.companyName).trim()) {
          companyMap[String(meCid)] = String(me.companyName).trim();
        }
        setLookups({
          users: listOf(usersJson, normalizeUser),
          sites: listOf(sitesJson, normalizeSite),
          profiles: listOf(profilesJson, normalizeProfile),
          companyMap,
        });
      } catch (e) {
        if (!ac.signal.aborted) console.warn("[attendance lookups]", e);
      }
    })();
    return () => ac.abort();
  }, []);

  return lookups;
}
