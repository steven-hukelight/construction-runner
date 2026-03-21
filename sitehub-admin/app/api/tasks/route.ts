import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

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
        .select("id, title, description, status, company_id, site_id, assigned_to, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      return NextResponse.json(data || []);
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
        return NextResponse.json(merged);
      }
      return NextResponse.json([]);
    }
    if (companyId) {
      let tasksQuery = supabaseAdmin
        .from("tasks")
        .select("id, title, description, status, company_id, site_id, assigned_to, created_at")
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
        const enriched = list.map((t) => ({
          ...t,
          assigned_to_ids: byTask.get(t.id) ?? (t.assigned_to ? [t.assigned_to] : []),
        }));
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

  const insertPayload: Record<string, unknown> = {
    id: crypto.randomUUID(),
    title: (b.title ?? "Untitled") as string,
    description: (b.description ?? "") as string,
    status: (b.status ?? "OPEN") as string,
    company_id: assignedCompanyId,
    site_id: (b.siteId ?? b.site_id ?? null) as string | null,
    assigned_to: firstAssignee ?? null,
  };

  const { data, error } = await supabaseAdmin.from("tasks").insert(insertPayload).select("id").single();

  if (error) {
    console.error("POST /api/tasks failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const taskId = data?.id;
  if (taskId && Array.isArray(assignedToIds) && assignedToIds.length > 0) {
    const uniqueIds = [...new Set(assignedToIds)].filter(Boolean);
    await supabaseAdmin.from("task_assignments").insert(
      uniqueIds.map((uid) => ({ task_id: taskId, user_id: uid }))
    );
  }

  return NextResponse.json({ id: taskId }, { status: 201 });
}
