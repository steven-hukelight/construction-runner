import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userIdsSignedInAtSite } from "@/lib/auth/siteAudience";
import { londonMidnightIso, parseNameList, plotRunNames, uniquePlaceNames, uniqueRecentPlaces } from "@/lib/worklog/rules";

export type WorkName = { id: string; name: string };

export type OpenSegment = {
  id: string;
  placeId: string;
  placeName: string;
  activityId: string;
  activityName: string;
  startedAt: string;
};

export type WorkBoardRow = {
  id: string;
  userId: string;
  person: string;
  placeName: string;
  activityName: string;
  startedAt: string;
  endedAt: string | null;
};

async function namesFor(userIds: string[]): Promise<Map<string, string>> {
  if (!userIds.length) return new Map();
  const { data, error } = await supabaseAdmin.from("users").select("id, name, email").in("id", userIds);
  if (error) throw new Error(`users: ${error.message}`);
  return new Map(
    (data ?? []).map((u) => [String(u.id), String(u.name ?? "").trim() || String(u.email ?? "").trim() || "Unnamed"]),
  );
}

export async function siteOwnerId(siteId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("sites")
    .select("company_id")
    .eq("id", siteId)
    .maybeSingle();
  if (error) throw new Error(`sites: ${error.message}`);
  if (!data) return null;
  const owner = String(data.company_id ?? "").trim();
  return owner || null;
}

export async function loadCatalogue(siteId: string): Promise<{ places: WorkName[]; activities: WorkName[] }> {
  const [places, activities] = await Promise.all([
    supabaseAdmin.from("work_places").select("id, name").eq("site_id", siteId).order("name"),
    supabaseAdmin.from("work_activities").select("id, name").eq("site_id", siteId).order("name"),
  ]);
  if (places.error) throw new Error(`work_places: ${places.error.message}`);
  if (activities.error) throw new Error(`work_activities: ${activities.error.message}`);
  return {
    places: (places.data ?? []).map((r) => ({ id: String(r.id), name: String(r.name) })),
    activities: (activities.data ?? []).map((r) => ({ id: String(r.id), name: String(r.name) })),
  };
}

async function upsertNames(
  siteId: string,
  companyId: string,
  table: "work_places" | "work_activities",
  names: string[],
): Promise<number> {
  if (!names.length) return 0;
  const { error } = await supabaseAdmin.from(table).upsert(
    names.map((name) => ({ company_id: companyId, site_id: siteId, name })),
    { onConflict: "site_id,name", ignoreDuplicates: true },
  );
  if (error) throw new Error(`${table}: ${error.message}`);
  return names.length;
}

export async function addNames(
  siteId: string,
  companyId: string,
  table: "work_places" | "work_activities",
  raw: string,
): Promise<number> {
  return upsertNames(siteId, companyId, table, parseNameList(raw));
}

export async function addNameList(
  siteId: string,
  companyId: string,
  table: "work_places" | "work_activities",
  names: string[],
): Promise<number> {
  return upsertNames(siteId, companyId, table, uniquePlaceNames(names));
}

export async function addPlotRun(
  siteId: string,
  companyId: string,
  input: { block?: string; core?: string; from: number; to: number; pad?: boolean },
): Promise<number> {
  return upsertNames(siteId, companyId, "work_places", plotRunNames(input));
}

export async function removeName(
  siteId: string,
  companyId: string,
  table: "work_places" | "work_activities",
  id: string,
): Promise<void> {
  const trimmed = id.trim();
  if (!trimmed) throw new Error("Choose a name to remove");
  const column = table === "work_places" ? "place_id" : "activity_id";
  const { count, error: usedErr } = await supabaseAdmin
    .from("work_segments")
    .select("id", { count: "exact", head: true })
    .eq(column, trimmed)
    .eq("site_id", siteId);
  if (usedErr) throw new Error(`work_segments: ${usedErr.message}`);
  if ((count ?? 0) > 0) {
    throw new Error("Visits are logged against this. Remove it only when it has none.");
  }
  const { data, error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq("id", trimmed)
    .eq("site_id", siteId)
    .eq("company_id", companyId)
    .select("id");
  if (error) throw new Error(`${table}: ${error.message}`);
  if (!data?.length) throw new Error("Not found");
}

export async function removeNames(
  siteId: string,
  companyId: string,
  table: "work_places" | "work_activities",
  ids: string[],
): Promise<{ removed: number; kept: number }> {
  const trimmed = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  if (!trimmed.length) throw new Error("Choose a name to remove");
  const column = table === "work_places" ? "place_id" : "activity_id";
  const { data: used, error: usedErr } = await supabaseAdmin
    .from("work_segments")
    .select(column)
    .eq("site_id", siteId)
    .in(column, trimmed);
  if (usedErr) throw new Error(`work_segments: ${usedErr.message}`);
  const usedIds = new Set((used ?? []).map((row) => String((row as Record<string, unknown>)[column] ?? "")));
  const removable = trimmed.filter((id) => !usedIds.has(id));
  if (!removable.length) {
    throw new Error("Visits are logged against this. Remove it only when it has none.");
  }
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq("site_id", siteId)
    .eq("company_id", companyId)
    .in("id", removable);
  if (error) throw new Error(`${table}: ${error.message}`);
  return { removed: removable.length, kept: trimmed.length - removable.length };
}

async function openSignInAt(userId: string, siteId: string): Promise<string | null> {
  const ids = await userIdsSignedInAtSite(siteId);
  if (!ids.includes(userId)) return null;
  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("timestamp, created_at")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`attendance: ${error.message}`);
  const at = (data?.timestamp as string | null) || (data?.created_at as string | null);
  return at ? String(at) : new Date().toISOString();
}

async function closeOpen(userId: string, at: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("work_segments")
    .update({ ended_at: at })
    .eq("user_id", userId)
    .is("ended_at", null);
  if (error) throw new Error(`work_segments: ${error.message}`);
}

async function placeAndActivity(siteId: string, placeId: string, activityId: string): Promise<boolean> {
  const [place, activity] = await Promise.all([
    supabaseAdmin.from("work_places").select("id").eq("id", placeId).eq("site_id", siteId).maybeSingle(),
    supabaseAdmin.from("work_activities").select("id").eq("id", activityId).eq("site_id", siteId).maybeSingle(),
  ]);
  return Boolean(place.data && activity.data);
}

/** Start a visit now. Closes whatever place this person was on. */
export async function startSegment(input: {
  siteId: string;
  companyId: string;
  userId: string;
  placeId: string;
  activityId: string;
  loggedBy: string | null;
}): Promise<void> {
  const signedIn = await openSignInAt(input.userId, input.siteId);
  if (!signedIn) throw new Error("Sign in to this site first");
  if (!(await placeAndActivity(input.siteId, input.placeId, input.activityId))) {
    throw new Error("Choose a place and an activity from this site");
  }
  const now = new Date().toISOString();
  await closeOpen(input.userId, now);
  const { error } = await supabaseAdmin.from("work_segments").insert({
    company_id: input.companyId,
    site_id: input.siteId,
    user_id: input.userId,
    place_id: input.placeId,
    activity_id: input.activityId,
    started_at: now,
    logged_by: input.loggedBy,
  });
  if (error) throw new Error(`work_segments: ${error.message}`);
}

/** Fill a day that had no place, from the open sign-in until now. */
export async function catchUpSegment(input: {
  siteId: string;
  companyId: string;
  userId: string;
  placeId: string;
  activityId: string;
  loggedBy: string | null;
}): Promise<void> {
  const signedInAt = await openSignInAt(input.userId, input.siteId);
  if (!signedInAt) throw new Error("Sign in to this site first");
  if (!(await placeAndActivity(input.siteId, input.placeId, input.activityId))) {
    throw new Error("Choose a place and an activity from this site");
  }
  const { data: open } = await supabaseAdmin
    .from("work_segments")
    .select("id")
    .eq("user_id", input.userId)
    .is("ended_at", null)
    .maybeSingle();
  if (open) return;
  const now = new Date().toISOString();
  const started = signedInAt < now ? signedInAt : now;
  const { error } = await supabaseAdmin.from("work_segments").insert({
    company_id: input.companyId,
    site_id: input.siteId,
    user_id: input.userId,
    place_id: input.placeId,
    activity_id: input.activityId,
    started_at: started,
    ended_at: now,
    logged_by: input.loggedBy,
  });
  if (error) throw new Error(`work_segments: ${error.message}`);
}

export async function closeMySegment(userId: string): Promise<void> {
  await closeOpen(userId, new Date().toISOString());
}

export async function openSegmentFor(userId: string, siteId: string): Promise<OpenSegment | null> {
  const { data, error } = await supabaseAdmin
    .from("work_segments")
    .select("id, place_id, activity_id, started_at")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .is("ended_at", null)
    .maybeSingle();
  if (error) throw new Error(`work_segments: ${error.message}`);
  if (!data) return null;
  const [place, activity] = await Promise.all([
    supabaseAdmin.from("work_places").select("name").eq("id", data.place_id).maybeSingle(),
    supabaseAdmin.from("work_activities").select("name").eq("id", data.activity_id).maybeSingle(),
  ]);
  return {
    id: String(data.id),
    placeId: String(data.place_id),
    placeName: String(place.data?.name ?? "Place"),
    activityId: String(data.activity_id),
    activityName: String(activity.data?.name ?? "Activity"),
    startedAt: String(data.started_at),
  };
}

export type RecentChoice = {
  placeId: string;
  placeName: string;
  activityId: string;
  activityName: string;
};

export async function recentChoices(userId: string, siteId: string, limit = 6): Promise<RecentChoice[]> {
  const { data, error } = await supabaseAdmin
    .from("work_segments")
    .select("place_id, activity_id")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .order("started_at", { ascending: false })
    .limit(40);
  if (error) throw new Error(`work_segments: ${error.message}`);
  const picks = uniqueRecentPlaces(data ?? [], limit);
  if (!picks.length) return [];
  const [places, activities] = await Promise.all([
    supabaseAdmin.from("work_places").select("id, name").eq("site_id", siteId).in(
      "id",
      picks.map((p) => p.placeId),
    ),
    supabaseAdmin.from("work_activities").select("id, name").eq("site_id", siteId).in(
      "id",
      picks.map((p) => p.activityId),
    ),
  ]);
  if (places.error) throw new Error(`work_places: ${places.error.message}`);
  if (activities.error) throw new Error(`work_activities: ${activities.error.message}`);
  const placeName = new Map((places.data ?? []).map((p) => [String(p.id), String(p.name)]));
  const activityName = new Map((activities.data ?? []).map((a) => [String(a.id), String(a.name)]));
  return picks
    .filter((p) => placeName.has(p.placeId) && activityName.has(p.activityId))
    .map((p) => ({
      placeId: p.placeId,
      placeName: placeName.get(p.placeId) ?? "Place",
      activityId: p.activityId,
      activityName: activityName.get(p.activityId) ?? "Activity",
    }));
}

export async function lastChoice(userId: string, siteId: string): Promise<{ placeId: string; activityId: string } | null> {
  const recent = await recentChoices(userId, siteId, 1);
  const first = recent[0];
  return first ? { placeId: first.placeId, activityId: first.activityId } : null;
}

export async function todayBoard(siteId: string, now = new Date()): Promise<{ rows: WorkBoardRow[]; missing: WorkName[] }> {
  const since = londonMidnightIso(now);
  const signedIn = await userIdsSignedInAtSite(siteId);
  const [today, stillOpen] = await Promise.all([
    supabaseAdmin
      .from("work_segments")
      .select("id, user_id, place_id, activity_id, started_at, ended_at")
      .eq("site_id", siteId)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("work_segments")
      .select("id, user_id, place_id, activity_id, started_at, ended_at")
      .eq("site_id", siteId)
      .is("ended_at", null)
      .limit(500),
  ]);
  if (today.error) throw new Error(`work_segments: ${today.error.message}`);
  if (stillOpen.error) throw new Error(`work_segments: ${stillOpen.error.message}`);
  const byId = new Map<string, (typeof today.data)[number]>();
  for (const row of [...(stillOpen.data ?? []), ...(today.data ?? [])]) byId.set(String(row.id), row);
  const segments = [...byId.values()];
  for (const row of segments) {
    if (row.ended_at == null && !signedIn.includes(String(row.user_id))) {
      await closeOpen(String(row.user_id), now.toISOString());
      row.ended_at = now.toISOString();
    }
  }
  const placeIds = [...new Set(segments.map((r) => String(r.place_id)))];
  const activityIds = [...new Set(segments.map((r) => String(r.activity_id)))];
  const userIds = [...new Set([...segments.map((r) => String(r.user_id)), ...signedIn])];
  const [places, activities, names] = await Promise.all([
    placeIds.length
      ? supabaseAdmin.from("work_places").select("id, name").in("id", placeIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    activityIds.length
      ? supabaseAdmin.from("work_activities").select("id, name").in("id", activityIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    namesFor(userIds),
  ]);
  const placeName = new Map((places.data ?? []).map((p) => [String(p.id), String(p.name)]));
  const activityName = new Map((activities.data ?? []).map((a) => [String(a.id), String(a.name)]));
  const covered = new Set(segments.filter((r) => r.ended_at == null).map((r) => String(r.user_id)));
  return {
    rows: segments.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      person: names.get(String(r.user_id)) ?? "Unknown",
      placeName: placeName.get(String(r.place_id)) ?? "Place",
      activityName: activityName.get(String(r.activity_id)) ?? "Activity",
      startedAt: String(r.started_at),
      endedAt: (r.ended_at as string | null) ?? null,
    })),
    missing: signedIn
      .filter((id) => !covered.has(id))
      .map((id) => ({ id, name: names.get(id) ?? "Unknown" })),
  };
}
