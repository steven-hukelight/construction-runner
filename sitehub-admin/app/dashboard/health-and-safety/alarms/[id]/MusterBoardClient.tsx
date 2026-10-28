"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ALARM_LABELS,
  STAND_DOWN_OUTCOMES,
  londonClock,
  roleLabel,
  type AlarmType,
  type MusterBoard,
} from "@/lib/siteAlarms/types";

type AlarmView = {
  id: string;
  site_id: string;
  site_name: string;
  type: AlarmType;
  status: "active" | "stood_down";
  is_drill: boolean;
  raised_by_name: string;
  raised_by_role: string | null;
  raised_at: string;
  additional_raisers: { name: string; raised_at: string }[];
  stood_down_by_name: string | null;
  stood_down_at: string | null;
  stand_down_reason: string | null;
  outcome: string | null;
  note: string | null;
  can_manage: boolean;
  counts: { on_site: number; unaccounted: number; need_help: number; safe: number; responding: number };
};

type Person = { user_id: string; name: string; role: string | null; responded_at?: string };

function Group({ title, people, tone }: { title: string; people: Person[]; tone: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className={`font-semibold ${tone}`}>{title}</h3>
      {!people.length ? (
        <p className="text-sm text-slate-500 mt-2">None</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {people.map((p) => (
            <li key={p.user_id} className="py-2 text-sm flex justify-between gap-3">
              <span>
                {p.name}
                {p.role ? <span className="text-slate-500"> · {roleLabel(p.role) || p.role}</span> : null}
              </span>
              {p.responded_at ? <span className="text-slate-500 whitespace-nowrap">{londonClock(p.responded_at)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function MusterBoardClient({ alarmId }: { alarmId: string }) {
  const [alarm, setAlarm] = useState<AlarmView | null>(null);
  const [board, setBoard] = useState<MusterBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<(typeof STAND_DOWN_OUTCOMES)[number]>("genuine");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/alarms/${alarmId}?plan=0`, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't load the alarm");
      setAlarm(data.alarm);
      setBoard(data.board ?? null);
      setError(null);
      if (data.alarm?.is_drill) setOutcome("drill");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the alarm");
    }
  }, [alarmId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
  }, [load]);

  async function standDown() {
    if (!reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/alarms/${alarmId}/stand-down`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), outcome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't stand the alarm down");
      setAlarm(data.alarm);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't stand the alarm down");
    } finally {
      setBusy(false);
    }
  }

  async function exportPdf() {
    if (!alarm || !board) return;
    setExporting(true);
    try {
      const [{ buildMusterReportPdf }, branding] = await Promise.all([
        import("@/lib/siteAlarms/musterPdf"),
        import("@/lib/pdf/fetchPdfBrandingClient").then((m) => m.fetchPdfBrandingClient()),
      ]);
      const doc = buildMusterReportPdf(alarm, board, branding);
      doc.save(`muster-${alarm.site_name.replace(/\s+/g, "-").toLowerCase()}-${alarm.raised_at.slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  if (!alarm && !error) return <p className="text-sm text-slate-500">Loading muster board…</p>;
  if (!alarm) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/dashboard/health-and-safety/alarms" className="text-sm text-blue-600">
          Back to alarms
        </Link>
      </div>
    );
  }

  const label = ALARM_LABELS[alarm.type]?.name ?? alarm.type;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/health-and-safety/alarms" className="text-sm text-blue-600">
          ← Alarms
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {alarm.is_drill ? "DRILL · " : ""}
          {label} · {alarm.site_name}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Raised by {alarm.raised_by_name}
          {alarm.raised_by_role ? ` (${alarm.raised_by_role})` : ""} at {londonClock(alarm.raised_at)}
        </p>
        {alarm.additional_raisers?.length ? (
          <p className="text-sm text-slate-500">
            Also raised by {alarm.additional_raisers.map((r) => `${r.name} (${londonClock(r.raised_at)})`).join(", ")}
          </p>
        ) : null}
        {alarm.note ? <p className="text-sm text-slate-700 mt-1">{alarm.note}</p> : null}
        {alarm.status === "stood_down" && (
          <p className="text-sm text-slate-600 mt-1">
            Stood down by {alarm.stood_down_by_name}
            {alarm.stood_down_at ? ` at ${londonClock(alarm.stood_down_at)}` : ""}
            {alarm.stand_down_reason ? ` — ${alarm.stand_down_reason}` : ""}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void exportPdf()}
          disabled={!board || exporting}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {exporting ? "Preparing PDF…" : "Export muster PDF"}
        </button>
        <Link href={`/dashboard/sites/${alarm.site_id}/emergency`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium">
          Emergency plan
        </Link>
      </div>

      {alarm.status === "active" && alarm.can_manage && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <h3 className="font-semibold text-red-800">Stand down</h3>
          <p className="text-sm text-red-800">Sends an all-clear to everyone who was alerted. People still signed in stay on site.</p>
          <textarea
            className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
            rows={2}
            placeholder="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <select
            className="rounded-lg border border-red-200 px-3 py-2 text-sm bg-white"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as typeof outcome)}
          >
            {STAND_DOWN_OUTCOMES.map((value) => (
              <option key={value} value={value}>
                {value === "false_alarm" ? "False alarm" : value === "drill" ? "Drill" : "Genuine alarm"}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void standDown()}
            disabled={busy || !reason.trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Standing down…" : "Stand down this alarm"}
          </button>
        </section>
      )}

      {board ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Group title={`Unaccounted (${board.unaccounted.length})`} people={board.unaccounted} tone="text-amber-700" />
          <Group title={`Need help (${board.needHelp.length})`} people={board.needHelp} tone="text-red-700" />
          <Group title={`First aiders responding (${board.responding.length})`} people={board.responding} tone="text-blue-700" />
          <Group title={`Safe (${board.safe.length})`} people={board.safe} tone="text-emerald-700" />
        </div>
      ) : (
        <p className="text-sm text-slate-500">Muster board is only shown to supervisors and admins for this site.</p>
      )}
    </div>
  );
}
