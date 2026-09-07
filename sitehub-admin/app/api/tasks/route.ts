import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { sendPushToUsers } from "@/lib/onesignal";

type TaskRow = {
  id?: string;
  site_id?: string | null;
  assigned_to?: string | null;
  assigned_to_ids?: string[];
  [k: string]: unknown;
};

async function enrichTasksWithNames(list: TaskRow[]): Promise<TaskRow[]> {
  if (list.length === 0) return list;
  const siteIds = [...new Set(list.map((t) => t.site_id).filter(Boolean))] as string[];
  const userIds = new Set<string>();
  for (const t of list) {
    const ids = t.assigned_to_ids ?? (t.assigned_to ? [t.assigned_to] : []);
    ids.forEach((id) => userIds.add(id));
  }
  const [sitesRes, usersRes] = await Promise.all([
    siteIds.length > 0
      ? supabaseAdmin.from("sites").select("id, name").in("id", siteIds)
      : { data: [] },
    userIds.size > 0
      ? supabaseAdmin.from("users").select("id, display_name, email").in("id", [...userIds])
      : { data: [] },
  ]);
  const siteMap = new Map<string, string>();
  (sitesRes.data ?? []).forEach((s: { id: string; name?: string }) => {
    siteMap.set(s.id, s.name ?? s.id);
  });
  const userMap = new Map<string, string>();
  (usersRes.data ?? []).forEach((u: { id: string; display_name?: string; email?: string }) => {
    const name = u.display_name?.trim() || (u.email ? String(u.email).split("@")[0] : null);
    userMap.set(u.id, name || u.id);
  });
  return list.map((t) => {
    const assigneeIds = t.assigned_to_ids ?? (t.assigned_to ? [t.assigned_to] : []);
    const assignedNames = assigneeIds.map((id) => userMap.get(id) ?? id).filter(Boolean);
    return {
      ...t,
      site_name: t.site_id ? (siteMap.get(t.site_id) ?? t.site_id) : null,
      assigned_to_names: assignedNames,
    };
  });
}

async function enrichTasksWithAttachments(list: TaskRow[]): Promise<TaskRow[]> {
  if (list.length === 0) return list;
  const taskIds = list.map((t) => t.id).filter(Boolean) as string[];
  const { data: attachments } = await supabaseAdmin
    .from("task_attachments")
    .select("id, task_id, file_url, file_name, file_type, created_at")
    .in("task_id", taskIds)
    .order("created_at", { ascending: true });
  const byTask = new Map<string, { id: string; file_url: string; file_name?: string; file_type?: string }[]>();
  for (const a of attachments ?? []) {
    const tid = (a as { task_id: string }).task_id;
    const arr = byTask.get(tid) ?? [];
    arr.push({
      id: (a as { id: string }).id,
      file_url: (a as { file_url: string }).file_url,
      file_name: (a as { file_name?: string }).file_name,
      file_type: (a as { file_type?: string }).file_type,
    });
    byTask.set(tid, arr);
  }
  return list.map((t) => ({
    ...t,
    attachments: byTask.get(String(t.id)) ?? [],
  }));
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const { searchParams } = new URL(req.url);
    const role = cookieStore.get("role")?.value;
    let companyId = searchParams.get("companyId")?.trim() || cookieStore.get("companyId")?.value;
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500);
    const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;
    const siteId = searchParams.get("siteId")?.trim() || searchParams.get("site_id")?.trim();

    if (role === "superuser" && !companyId) {
      const { data } = await supabaseAdmin
        .from("tasks")
        .select("id, title, description, status, company_id, site_id, assigned_to, created_at, due_date")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      const list = (data || []) as TaskRow[];
      let enriched = await enrichTasksWithNames(list);
      enriched = await enrichTasksWithAttachments(enriched);
      return NextResponse.json(enriched);
    }
    const roleLower = (role ?? "").toLowerCase();
    if (roleLower === "operative") {
      const { data: me } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", cookieStore.get("user_email")?.value ?? "")
        .maybeSingle();
      if (me?.id) {
        const { data: assignments } = await supabaseAdmin
          .from("task_assignments")
          .select("task_id")
          .eq("user_id", me.id);
        const taskIds = (assignments ?? []).map((a) => a.task_id);
        const { data: byAssignment } = taskIds.length > 0
          ? await supabaseAdmin.from("tasks").select("*").in("id", taskIds).order("created_at", { ascending: false })
          : { data: [] };
        const { data: byLegacy } = await supabaseAdmin
          .from("tasks")
          .select("*")
          .eq("assigned_to", me.id)
          .order("created_at", { ascending: false });
        const seen = new Set<string>();
        const merged = [...(byAssignment ?? []), ...(byLegacy ?? [])].filter((t) => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        merged.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
        let enriched = await enrichTasksWithNames(merged as TaskRow[]);
        enriched = await enrichTasksWithAttachments(enriched);
        return NextResponse.json(enriched);
      }
      return NextResponse.json([]);
    }
    if (companyId) {
      let tasksQuery = supabaseAdmin
        .from("tasks")
        .select("id, title, description, status, company_id, site_id, assigned_to, created_at, due_date")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (siteId) tasksQuery = tasksQuery.eq("site_id", siteId);
      const { data: tasks } = await tasksQuery;
      const list = tasks ?? [];
      if (list.length > 0) {
        const { data: assignments } = await supabaseAdmin
          .from("task_assignments")
          .select("task_id, user_id")
          .in("task_id", list.map((t) => t.id));
        const byTask = new Map<string, string[]>();
        for (const a of assignments ?? []) {
          const arr = byTask.get(a.task_id) ?? [];
          if (!arr.includes(a.user_id)) arr.push(a.user_id);
          byTask.set(a.task_id, arr);
        }
        const withIds = list.map((t) => ({
          ...t,
          assigned_to_ids: byTask.get(t.id) ?? (t.assigned_to ? [t.assigned_to] : []),
        }));
        let enriched = await enrichTasksWithNames(withIds);
        enriched = await enrichTasksWithAttachments(enriched);
        return NextResponse.json(enriched);
      }
      return NextResponse.json([]);
    }
    return NextResponse.json([]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/tasks failed:", msg);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const queryCompanyId = new URL(req.url).searchParams.get("companyId")?.trim() || undefined;
  let companyId = cookieStore.get("companyId")?.value ?? (body as Record<string, unknown>)?.companyId ?? (body as Record<string, unknown>)?.company_id;
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
        queryCompanyId,
      })) || undefined;
  }
  const b = body as Record<string, unknown>;
  const assignedCompanyId = role === "superuser" ? (b.companyId ?? b.company_id ?? queryCompanyId ?? companyId ?? null) : (companyId ?? null);

  if (!assignedCompanyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const assignedToIds = (b.assignedToIds ?? (b.assignedTo ? [b.assignedTo] : [])) as string[];
  const firstAssignee = Array.isArray(assignedToIds) ? assignedToIds[0] : assignedToIds;

  const dueDateVal = (b.dueDate ?? b.due_date ?? null) as string | null;
  const insertPayload: Record<string, unknown> = {
    id: crypto.randomUUID(),
    title: (b.title ?? "Untitled") as string,
    description: (b.description ?? "") as string,
    status: (b.status ?? "OPEN") as string,
    company_id: assignedCompanyId,
    site_id: (b.siteId ?? b.site_id ?? null) as string | null,
    assigned_to: firstAssignee ?? null,
    due_date: dueDateVal && String(dueDateVal).trim() ? dueDateVal : null,
  };

  const { data, error } = await supabaseAdmin.from("tasks").insert(insertPayload).select("id").single();

  if (error) {
    console.error("POST /api/tasks failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const taskId = data?.id;
  const taskTitle = (insertPayload.title as string) || "Untitled Task";
  if (taskId && Array.isArray(assignedToIds) && assignedToIds.length > 0) {
    const uniqueIds = [...new Set(assignedToIds)].filter(Boolean);
    await supabaseAdmin.from("task_assignments").insert(
      uniqueIds.map((uid) => ({ task_id: taskId, user_id: uid }))
    );
    sendPushToUsers(uniqueIds, "New task assigned", taskTitle, {
      type: "task",
      taskId: String(taskId),
      screen: "tasks",
    })
      .then((r) => {
        if (!r.sent) {
          console.error("Task push not delivered:", r.error, "→ assignee ids:", uniqueIds.join(", "));
        }
      })
      .catch((e) => console.error("Task push failed:", e));
  }

  return NextResponse.json({ id: taskId }, { status: 201 });
}
