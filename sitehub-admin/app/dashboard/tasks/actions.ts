"use server";

import { getServerRequestBaseUrl } from "@/lib/serverRequestBaseUrl";
import { headers } from "next/headers";

async function getCookieHeader(): Promise<string | undefined> {
  try {
    return (await headers()).get("cookie") ?? undefined;
  } catch {
    return undefined;
  }
}

export async function fetchTasks(companyId?: string, cookieHeader?: string) {
  try {
    const base = await getServerRequestBaseUrl();
    let url = `${base}/api/tasks`;
    if (companyId) url += `?companyId=${encodeURIComponent(companyId)}`;
    const headersInit: HeadersInit = { "Cache-Control": "no-store" };
    const cookie = cookieHeader ?? (await getCookieHeader());
    if (cookie) headersInit.Cookie = cookie;
    const res = await fetch(url, { cache: "no-store", headers: headersInit });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    console.error("fetchTasks:", e);
    return [];
  }
}

async function tasksBase(): Promise<string> {
  return getServerRequestBaseUrl();
}

export async function createTask(data: {
  title?: string;
  description?: string;
  siteId?: string;
  assignedTo?: string;
  assignedToIds?: string[];
  dueDate?: string;
}) {
  const base = await tasksBase();
  const url = `${base}/api/tasks`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  if (cookie) headersInit.Cookie = cookie;
  const payload = {
    ...data,
    assignedToIds: data.assignedToIds ?? (data.assignedTo ? [data.assignedTo] : []),
  };
  const res = await fetch(url, { method: "POST", headers: headersInit, body: JSON.stringify(payload) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create task");
  }
}

export async function updateTaskStatus(id: string, status: string) {
  const base = await tasksBase();
  const url = `${base}/api/tasks/${id}`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, { method: "PATCH", headers: headersInit, body: JSON.stringify({ status }) });
}

export async function deleteTask(id: string) {
  const base = await tasksBase();
  const url = `${base}/api/tasks/${id}`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = {};
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, { method: "DELETE", headers: headersInit });
}
