"use server";

import { getBaseUrl } from "@/lib/url";
import { headers } from "next/headers";

async function getCookieHeader(): Promise<string | undefined> {
  try {
    return (await headers()).get("cookie") ?? undefined;
  } catch {
    return undefined;
  }
}

export async function fetchTasks(companyId?: string, cookieHeader?: string) {
  const base = getBaseUrl();
  let url = `${base}/api/tasks`;
  if (companyId) url += `?companyId=${encodeURIComponent(companyId)}`;
  const headersInit: HeadersInit = { "Cache-Control": "no-store" };
  const cookie = cookieHeader ?? (await getCookieHeader());
  if (cookie) headersInit.Cookie = cookie;
  const res = await fetch(url, { cache: "no-store", headers: headersInit });
  if (!res.ok) return [];
  return res.json();
}

export async function createTask(data: {
  title?: string;
  siteId?: string;
  assignedTo?: string;
  assignedToIds?: string[];
  dueDate?: string;
}) {
  const base = getBaseUrl();
  const url = `${base}/api/tasks`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  if (cookie) headersInit.Cookie = cookie;
  const payload = {
    ...data,
    assignedToIds: data.assignedToIds ?? (data.assignedTo ? [data.assignedTo] : []),
  };
  await fetch(url, { method: "POST", headers: headersInit, body: JSON.stringify(payload) });
}

export async function updateTaskStatus(id: string, status: string) {
  const base = getBaseUrl();
  const url = `${base}/api/tasks/${id}`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, { method: "PATCH", headers: headersInit, body: JSON.stringify({ status }) });
}

export async function deleteTask(id: string) {
  const base = getBaseUrl();
  const url = `${base}/api/tasks/${id}`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = {};
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, { method: "DELETE", headers: headersInit });
}
