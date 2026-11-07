"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { readError, ukDate } from "./types";

type Campaign = {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  publisher: string | null;
  starts_on: string;
  ends_on: string;
  acknowledged_count: number;
};

const EMPTY = { title: "", url: "", publisher: "", summary: "", startsOn: "", endsOn: "" };

export default function CampaignsPanel({ canRecord }: { canRecord: boolean }) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/training-admin/campaigns", { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      setError(await readError(res, "Couldn't load campaigns"));
      return;
    }
    setError(null);
    setCampaigns(((await res.json()) as { campaigns: Campaign[] }).campaigns);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/training-admin/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        toast.error(await readError(res, "Couldn't save the campaign"));
        return;
      }
      setAdding(false);
      setForm(EMPTY);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this campaign card?")) return;
    const res = await fetch(`/api/training-admin/campaigns/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      toast.error(await readError(res, "Couldn't delete"));
      return;
    }
    setCampaigns((prev) => (prev ?? []).filter((c) => c.id !== id));
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        A campaign is a dated card on the Training screen that opens the publisher&apos;s page, for example an HSE dust
        campaign or a work at height week. Operatives acknowledge it once. It drops off after the end date. It does not count
        as passing a module.
      </p>
      {canRecord && !adding && (
        <Button size="sm" onClick={() => setAdding(true)}>
          Add a campaign
        </Button>
      )}
      {adding && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <Input label="Title" value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input label="Link (https)" value={form.url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, url: e.target.value }))} />
          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Publisher" value={form.publisher} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, publisher: e.target.value }))} placeholder="e.g. HSE" />
            <Input label="Starts" type="date" value={form.startsOn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, startsOn: e.target.value }))} />
            <Input label="Ends" type="date" value={form.endsOn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, endsOn: e.target.value }))} />
          </div>
          <Input label="Summary (optional)" value={form.summary} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, summary: e.target.value }))} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !form.title || !form.url || !form.startsOn || !form.endsOn}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {campaigns && !campaigns.length && <p className="text-sm text-slate-500">No campaigns yet.</p>}
      {campaigns && campaigns.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Campaign</th>
                <th className="px-4 py-2 font-medium">Dates</th>
                <th className="px-4 py-2 font-medium">Acknowledged</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const live = c.starts_on <= today && today <= c.ends_on;
                return (
                  <tr key={c.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2">
                      <a href={c.url} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">
                        {c.title}
                      </a>
                      {c.publisher && <div className="text-xs text-slate-500">{c.publisher}</div>}
                      {c.summary && <div className="text-xs text-slate-500">{c.summary}</div>}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {ukDate(c.starts_on)} to {ukDate(c.ends_on)}
                      <div className="text-xs text-slate-500">{live ? "Showing in the app" : c.ends_on < today ? "Ended" : "Not started"}</div>
                    </td>
                    <td className="px-4 py-2">{c.acknowledged_count}</td>
                    <td className="px-4 py-2">
                      {canRecord && (
                        <button type="button" onClick={() => remove(c.id)} className="text-red-600 hover:underline">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
