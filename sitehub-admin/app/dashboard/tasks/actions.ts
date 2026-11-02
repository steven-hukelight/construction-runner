"use server";

import { callRoute, callRouteList } from "@/lib/server/callRoute";
import { GET as getTasks, POST as postTask } from "@/app/api/tasks/route";
import { DELETE as deleteTaskRoute, PATCH as patchTask } from "@/app/api/tasks/[id]/route";

export async function fetchTasks(companyId?: string) {
  const path = companyId ? `/api/tasks?companyId=${encodeURIComponent(companyId)}` : "/api/tasks";
  return callRouteList(getTasks, path);
}

export async function createTask(data: {
  title?: string;
  description?: string;
  siteId?: string;
  assignedTo?: string;
  assignedToIds?: string[];
  dueDate?: string;
}) {
  if (!data.siteId?.trim()) {
    throw new Error("Select a site. This task will only appear for that site.");
  }
  const payload = {
    ...data,
    assignedToIds: data.assignedToIds ?? (data.assignedTo ? [data.assignedTo] : []),
  };
  const res = await callRoute(postTask, "/api/tasks", { method: "POST", body: payload });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create task");
  }
}

export async function updateTaskStatus(id: string, status: string) {
  await callRoute(patchTask, `/api/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: { status }, params: { id } });
}

export async function deleteTask(id: string) {
  await callRoute(deleteTaskRoute, `/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE", params: { id } });
}
