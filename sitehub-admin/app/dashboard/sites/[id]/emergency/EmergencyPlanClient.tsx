"use client";

import { useCallback, useEffect, useState } from "react";
import { ALARM_LABELS, ALARM_TYPES, type AlarmType, type MusterPoint } from "@/lib/siteAlarms/types";
import MusterPlanPin from "./MusterPlanPin";
import MusterMapPin from "./MusterMapPin";

type Plan = {
  muster_points: MusterPoint[];
  instructions: Partial<Record<AlarmType, string>>;
  first_aid_info: string | null;
  fire_strategy: { url: string; mime: string | null; name: string | null } | null;
  site_plan: { url: string; width: number | null; height: number | null } | null;
};

type Payload = { plan: Plan; can_edit?: boolean; site?: { name: string } };

function blankPoint(): MusterPoint {
  return { id: `mp_${Date.now().toString(36)}`, name: "", description: null, lat: null, lng: null, plan_x: null, plan_y: null };
}

async function uploadPlanFile(siteId: string, kind: "fire_strategy" | "site_plan", file: File) {
  const start = await fetch(`/api/sites/${siteId}/emergency-plan/upload`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: "start", kind, mime: file.type || "application/octet-stream", size: file.size }),
  });
  const startBody = await start.json();
  if (!start.ok) throw new Error(startBody.error ?? "Couldn't start the upload");
  const put = await fetch(startBody.uploadUrl as string, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
  if (!put.ok) throw new Error("Upload failed. Try a smaller file.");
  const done = await fetch(`/api/sites/${siteId}/emergency-plan/upload`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: "complete", kind, path: startBody.path, fileName: file.name }),
  });
  const body = await done.json();
  if (!done.ok) throw new Error(body.error ?? "Couldn't save the file");
  return body.plan as Plan;
}

export default function EmergencyPlanClient({ siteId, canEdit }: { siteId: string; canEdit: boolean }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [points, setPoints] = useState<MusterPoint[]>([]);
  const [instructions, setInstructions] = useState<Partial<Record<AlarmType, string>>>({});
  const [firstAid, setFirstAid] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<AlarmType>("fire");

  const load = useCallback(() => {
    fetch(`/api/sites/${siteId}/emergency-plan`, { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        const data = (await r.json()) as Payload & { error?: string };
        if (!r.ok) throw new Error(data.error ?? "Could not load the emergency plan");
        setPlan(data.plan);
        setPoints(data.plan.muster_points ?? []);
        setInstructions(data.plan.instructions ?? {});
        setFirstAid(data.plan.first_aid_info ?? "");
      })
      .catch((e: Error) => setError(e.message));
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  function updatePoint(id: string, patch: Partial<MusterPoint>) {
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/emergency-plan`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          muster_points: points,
          instructions,
          first_aid_info: firstAid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save");
      setPlan(data.plan);
      setPoints(data.plan.muster_points ?? []);
      setMessage("Emergency plan saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function onFile(kind: "fire_strategy" | "site_plan", file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    setError(null);
    setMessage(null);
    try {
      const next = await uploadPlanFile(siteId, kind, file);
      setPlan(next);
      setMessage(kind === "fire_strategy" ? "Fire strategy uploaded." : "Site plan uploaded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function removeFile(kind: "fire_strategy" | "site_plan") {
    setUploading(kind);
    setError(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/emergency-plan/upload?kind=${kind}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't remove the file");
      setPlan(data.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove the file");
    } finally {
      setUploading(null);
    }
  }

  const active = points.find((p) => p.id === activeId) ?? null;

  if (!plan && !error) return <p className="text-sm text-slate-500">Loading emergency plan…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold text-slate-900">Fire strategy</h3>
          <p className="text-sm text-slate-500">PDF or image. Operatives open this from the alarm screen.</p>
          {plan?.fire_strategy && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <a href={plan.fire_strategy.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                {plan.fire_strategy.name || "View fire strategy"}
              </a>
              {canEdit && (
                <button type="button" className="text-slate-500 hover:text-red-600" onClick={() => removeFile("fire_strategy")} disabled={!!uploading}>
                  Remove
                </button>
              )}
            </div>
          )}
          {canEdit && (
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              disabled={!!uploading}
              onChange={(e) => void onFile("fire_strategy", e.target.files?.[0])}
            />
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold text-slate-900">Site plan</h3>
          <p className="text-sm text-slate-500">PNG or JPG of the drawing you pin muster points on. If the fire strategy is an image, it is used until you upload a separate plan.</p>
          {plan?.site_plan && <MusterPlanPin src={plan.site_plan.url} points={points} activeId={activeId} onPlace={canEdit && active ? (x, y) => updatePoint(active.id, { plan_x: x, plan_y: y }) : undefined} />}
          {canEdit && (
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={!!uploading}
                onChange={(e) => void onFile("site_plan", e.target.files?.[0])}
              />
              {plan?.site_plan && (
                <button type="button" className="text-sm text-slate-500 hover:text-red-600" onClick={() => removeFile("site_plan")} disabled={!!uploading}>
                  Remove
                </button>
              )}
            </div>
          )}
          {canEdit && active && plan?.site_plan && <p className="text-xs text-slate-500">Click the plan to place “{active.name || "this point"}”.</p>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Muster points</h3>
            {canEdit && (
              <button
                type="button"
                className="text-sm text-blue-600"
                onClick={() => {
                  const next = blankPoint();
                  setPoints((p) => [...p, next]);
                  setActiveId(next.id);
                }}
              >
                Add
              </button>
            )}
          </div>
          {!points.length && <p className="text-sm text-slate-500">None yet.</p>}
          <ul className="space-y-2">
            {points.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${p.id === activeId ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}
                >
                  <span className="font-medium">{i + 1}. {p.name || "Unnamed"}</span>
                  {p.lat != null && p.lng != null && <span className="ml-2 text-slate-500">map</span>}
                  {p.plan_x != null && <span className="ml-2 text-slate-500">plan</span>}
                </button>
              </li>
            ))}
          </ul>
          {active && canEdit && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Name</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={active.name}
                  onChange={(e) => updatePoint(active.id, { name: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">How to get there</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  rows={2}
                  value={active.description ?? ""}
                  onChange={(e) => updatePoint(active.id, { description: e.target.value || null })}
                />
              </label>
              <p className="text-sm font-medium text-slate-700">Map position</p>
              <MusterMapPin
                lat={active.lat}
                lng={active.lng}
                onChange={(coords) => updatePoint(active.id, coords ?? { lat: null, lng: null })}
              />
              <button type="button" className="text-xs text-slate-500" onClick={() => updatePoint(active.id, { lat: null, lng: null })}>
                Clear map position
              </button>
              <button type="button" className="block text-sm text-red-600" onClick={() => setPoints((prev) => prev.filter((p) => p.id !== active.id))}>
                Remove this point
              </button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold text-slate-900">Instructions and first aid</h3>
          {ALARM_TYPES.map((type) => (
            <label key={type} className="block text-sm">
              <span className="font-medium text-slate-700">{ALARM_LABELS[type].name}</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                rows={2}
                disabled={!canEdit}
                value={instructions[type] ?? ""}
                onChange={(e) => setInstructions((prev) => ({ ...prev, [type]: e.target.value }))}
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="font-medium text-slate-700">First aid info</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              rows={2}
              disabled={!canEdit}
              value={firstAid}
              onChange={(e) => setFirstAid(e.target.value)}
            />
          </label>
        </section>

        {canEdit && (
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !!uploading}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save emergency plan"}
          </button>
        )}
      </div>

      <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 h-fit">
        <h3 className="font-semibold text-slate-900">What workers see</h3>
        <div className="flex flex-wrap gap-2">
          {ALARM_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setPreviewType(type)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${previewType === type ? "bg-slate-900 text-white" : "bg-white border border-slate-200"}`}
            >
              {ALARM_LABELS[type].name}
            </button>
          ))}
        </div>
        <p className="text-sm font-medium text-red-700">{ALARM_LABELS[previewType].pushTitle}</p>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{instructions[previewType]?.trim() || "No extra instructions yet."}</p>
        {previewType === "medical" && firstAid.trim() && (
          <p className="text-sm text-slate-700 whitespace-pre-wrap">First aid: {firstAid}</p>
        )}
        {(previewType === "fire" || previewType === "structural") && points.length > 0 && (
          <ol className="list-decimal list-inside text-sm text-slate-700 space-y-1">
            {points.map((p) => (
              <li key={p.id}>
                {p.name || "Muster point"}
                {p.description ? ` — ${p.description}` : ""}
              </li>
            ))}
          </ol>
        )}
        {previewType === "lockdown" && <p className="text-sm text-slate-500">Lockdown does not show muster points. Shelter in place.</p>}
      </aside>
    </div>
  );
}
