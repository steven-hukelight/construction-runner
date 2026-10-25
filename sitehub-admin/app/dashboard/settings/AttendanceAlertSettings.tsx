"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import type { AlertFrequency, AttendanceAlertPreferences } from "@/lib/attendanceAlerts/preferences";

type SiteOption = { id: string; name: string };
type PrefsResponse = { eligible: boolean; attendance: AttendanceAlertPreferences; sites: SiteOption[] };

const checkboxClass =
  "w-5 h-5 rounded border-gray-300 text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
const fieldClass =
  "h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

const CHANNELS: { key: keyof AttendanceAlertPreferences["channels"]; label: string; hint: string }[] = [
  { key: "mobile", label: "Mobile app", hint: "Push to the Construction Runner app" },
  { key: "web", label: "Browser", hint: "Push to this dashboard in your browser" },
  { key: "bell", label: "Dashboard bell", hint: "Listed under the bell, even in quiet hours" },
];

const EVENTS: { key: keyof AttendanceAlertPreferences["events"]; label: string }[] = [
  { key: "checkIn", label: "Check-in" },
  { key: "checkOut", label: "Check-out" },
  { key: "autoSignOut", label: "Automatic sign-out (left site or still signed in after 12 hours)" },
];

const FREQUENCIES: { value: AlertFrequency; label: string }[] = [
  { value: "instant", label: "Every check-in and check-out" },
  { value: "hourly", label: "Hourly summary" },
  { value: "daily", label: "End-of-day summary" },
];

function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/** Attendance alert settings for admins, site admins and supervisors. Renders nothing for anyone else. */
export default function AttendanceAlertSettings() {
  const [state, setState] = useState<"loading" | "error" | "ready" | "hidden">("loading");
  const [prefs, setPrefs] = useState<AttendanceAlertPreferences | null>(null);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/me/notification-preferences", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as PrefsResponse;
      if (!data.eligible) {
        setState("hidden");
        return;
      }
      setPrefs(data.attendance);
      setSites(data.sites);
      setDirty(false);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update(patch: Partial<AttendanceAlertPreferences>) {
    setPrefs((p) => (p ? { ...p, ...patch } : p));
    setDirty(true);
  }

  async function save() {
    if (!prefs) return;
    if (prefs.sites !== "all" && prefs.sites.length === 0) {
      toast.error("Choose at least one site, or all my sites");
      return;
    }
    setSaving(true);
    try {
      const timeZone = browserTimeZone();
      const res = await fetch("/api/me/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attendance: { ...prefs, ...(timeZone ? { timeZone } : {}) } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save");
      setPrefs((data as PrefsResponse).attendance);
      setSites((data as PrefsResponse).sites);
      setDirty(false);
      toast.success("Attendance alerts saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (state === "hidden") return null;

  if (state === "loading") {
    return (
      <div className="py-3 border-b space-y-2" aria-busy="true">
        <Skeleton className="h-4 w-40 rounded bg-gray-200" />
        <Skeleton className="h-4 w-72 rounded bg-gray-200" />
      </div>
    );
  }

  if (state === "error" || !prefs) {
    return (
      <div className="flex items-center justify-between gap-3 py-3 border-b">
        <p className="text-sm text-gray-700">Attendance alert settings could not be loaded.</p>
        <Button variant="secondary" size="sm" type="button" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  const choosingSites = prefs.sites !== "all";
  const chosen = new Set(prefs.sites === "all" ? [] : prefs.sites);

  return (
    <section className="py-3 border-b space-y-4" aria-labelledby="attendance-alerts-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label htmlFor="pref-attendance-alerts" id="attendance-alerts-heading" className="font-semibold text-gray-900">
            Attendance alerts
          </label>
          <p className="text-sm text-gray-600">
            Get told when operatives check in or out of the sites you look after
          </p>
        </div>
        <input
          id="pref-attendance-alerts"
          type="checkbox"
          className={checkboxClass}
          checked={prefs.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          disabled={saving}
        />
      </div>

      {prefs.enabled && (
        <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-slate-600">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-900 mb-1">Where</legend>
            {CHANNELS.map((c) => (
              <label key={c.key} className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className={`${checkboxClass} mt-0.5`}
                  checked={prefs.channels[c.key]}
                  onChange={(e) => update({ channels: { ...prefs.channels, [c.key]: e.target.checked } })}
                  disabled={saving}
                />
                <span>
                  {c.label}
                  <span className="block text-xs text-gray-500">{c.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-900 mb-1">Which events</legend>
            {EVENTS.map((ev) => (
              <label key={ev.key} className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={prefs.events[ev.key]}
                  onChange={(e) => update({ events: { ...prefs.events, [ev.key]: e.target.checked } })}
                  disabled={saving}
                />
                {ev.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-900 mb-1">Which sites</legend>
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="radio"
                name="attendance-alert-sites"
                className={checkboxClass}
                checked={!choosingSites}
                onChange={() => update({ sites: "all" })}
                disabled={saving}
              />
              All my sites
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="radio"
                name="attendance-alert-sites"
                className={checkboxClass}
                checked={choosingSites}
                onChange={() => update({ sites: [] })}
                disabled={saving || sites.length === 0}
              />
              Only these sites
            </label>
            {choosingSites && (
              <div className="ml-8 max-h-48 overflow-y-auto space-y-2">
                {sites.length === 0 ? (
                  <p className="text-sm text-gray-500">You are not assigned to any sites yet.</p>
                ) : (
                  sites.map((s) => (
                    <label key={s.id} className="flex items-center gap-3 text-sm text-gray-700 min-w-0">
                      <input
                        type="checkbox"
                        className={checkboxClass}
                        checked={chosen.has(s.id)}
                        onChange={(e) => {
                          const next = new Set(chosen);
                          if (e.target.checked) next.add(s.id);
                          else next.delete(s.id);
                          update({ sites: [...next] });
                        }}
                        disabled={saving}
                      />
                      <span className="truncate" title={s.name}>
                        {s.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="attendance-alert-frequency" className="block text-sm font-medium text-gray-900">
              How often
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                id="attendance-alert-frequency"
                className={fieldClass}
                value={prefs.frequency}
                onChange={(e) => update({ frequency: e.target.value as AlertFrequency })}
                disabled={saving}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              {prefs.frequency === "daily" && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  Send at
                  <input
                    type="time"
                    className={fieldClass}
                    value={prefs.dailySummaryTime}
                    onChange={(e) => e.target.value && update({ dailySummaryTime: e.target.value })}
                    disabled={saving}
                  />
                </label>
              )}
            </div>
            {prefs.frequency !== "instant" && (
              <p className="text-xs text-gray-500">One message per site, only when something happened.</p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-900 mb-1">Quiet hours</legend>
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={prefs.quietHours.enabled}
                onChange={(e) => update({ quietHours: { ...prefs.quietHours, enabled: e.target.checked } })}
                disabled={saving}
              />
              No pushes between
            </label>
            {prefs.quietHours.enabled && (
              <div className="ml-8 flex flex-wrap items-center gap-2 text-sm text-gray-700">
                <input
                  type="time"
                  aria-label="Quiet hours start"
                  className={fieldClass}
                  value={prefs.quietHours.start}
                  onChange={(e) => e.target.value && update({ quietHours: { ...prefs.quietHours, start: e.target.value } })}
                  disabled={saving}
                />
                and
                <input
                  type="time"
                  aria-label="Quiet hours end"
                  className={fieldClass}
                  value={prefs.quietHours.end}
                  onChange={(e) => e.target.value && update({ quietHours: { ...prefs.quietHours, end: e.target.value } })}
                  disabled={saving}
                />
              </div>
            )}
          </fieldset>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save attendance alerts"}
        </Button>
      </div>
    </section>
  );
}
