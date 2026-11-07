"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { readError, ukDate } from "./types";

type FaceFitRecord = {
  id: string;
  user_id: string;
  person_name: string;
  tested_at: string;
  review_due_at: string;
  result: "pass" | "fail";
  method: "qualitative" | "quantitative";
  mask_make: string;
  mask_model: string;
  mask_size: string | null;
  tester_name: string;
  notes: string | null;
  has_certificate: boolean;
};

type Person = { id: string; name: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusYears(iso: string, years: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  userId: "",
  testedAt: todayIso(),
  reviewDueAt: plusYears(todayIso(), 2),
  result: "pass",
  method: "qualitative",
  maskMake: "",
  maskModel: "",
  maskSize: "",
  testerName: "",
  notes: "",
};

export default function FaceFitPanel({ canRecord, faceFitOn }: { canRecord: boolean; faceFitOn: boolean }) {
  const [records, setRecords] = useState<FaceFitRecord[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/training-admin/face-fit", { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      setError(await readError(res, "Couldn't load face fit records"));
      return;
    }
    setError(null);
    setRecords(((await res.json()) as { records: FaceFitRecord[] }).records);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
    fetch("/api/training-admin/people", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { people: [] }))
      .then((m: { people?: Person[] }) => setPeople((m.people ?? []).map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => setPeople([]));
  }, [load]);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const body = new FormData();
      for (const [k, v] of Object.entries(form)) body.append(k, v);
      if (certificate) body.append("certificate", certificate);
      const res = await fetch("/api/training-admin/face-fit", { method: "POST", credentials: "include", body });
      if (!res.ok) {
        toast.error(await readError(res, "Couldn't save the record"));
        return;
      }
      toast.success("Face fit record saved");
      setAdding(false);
      setForm(EMPTY_FORM);
      setCertificate(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this face fit record?")) return;
    const res = await fetch(`/api/training-admin/face-fit/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      toast.error(await readError(res, "Couldn't delete"));
      return;
    }
    setRecords((prev) => (prev ?? []).filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        A face fit test is done in person by someone competent, with the actual mask. Log the result here. Watching a video
        never marks face fit as passed.
        {!faceFitOn && " Turn Face fit on under Modules so operatives see it in the app."}
      </p>
      {canRecord && !adding && (
        <Button size="sm" onClick={() => setAdding(true)}>
          Log a face fit test
        </Button>
      )}
      {adding && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Person</label>
            <select
              value={form.userId}
              onChange={(e) => set("userId", e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm"
            >
              <option value="">Select a person…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Test date" type="date" value={form.testedAt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("testedAt", e.target.value)} />
            <Input label="Review due" type="date" value={form.reviewDueAt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("reviewDueAt", e.target.value)} />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Result</label>
              <select value={form.result} onChange={(e) => set("result", e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm">
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Method</label>
              <select value={form.method} onChange={(e) => set("method", e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm">
                <option value="qualitative">Qualitative (taste test)</option>
                <option value="quantitative">Quantitative (machine)</option>
              </select>
            </div>
            <Input label="Mask make" value={form.maskMake} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("maskMake", e.target.value)} placeholder="e.g. 3M" />
            <Input label="Mask model" value={form.maskModel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("maskModel", e.target.value)} placeholder="e.g. Aura 9332+" />
            <Input label="Mask size (optional)" value={form.maskSize} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("maskSize", e.target.value)} />
            <Input label="Tester" value={form.testerName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("testerName", e.target.value)} />
          </div>
          <Input label="Notes (optional)" value={form.notes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("notes", e.target.value)} />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Certificate (optional, PDF or photo under 4 MB)</label>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => setCertificate(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !form.userId}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {records && !records.length && <p className="text-sm text-slate-500">No face fit tests logged yet.</p>}
      {records && records.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Person</th>
                <th className="px-4 py-2 font-medium">Mask</th>
                <th className="px-4 py-2 font-medium">Result</th>
                <th className="px-4 py-2 font-medium">Tested</th>
                <th className="px-4 py-2 font-medium">Review due</th>
                <th className="px-4 py-2 font-medium">Tester</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{r.person_name}</td>
                  <td className="px-4 py-2">
                    {[r.mask_make, r.mask_model, r.mask_size ? `size ${r.mask_size}` : null].filter(Boolean).join(" ")}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`status-chip ${r.result === "pass" ? "status-chip--ok" : "status-chip--danger"}`}>
                      {r.result === "pass" ? "Pass" : "Fail"}
                    </span>
                    <div className="text-xs text-slate-500">{r.method === "qualitative" ? "Qualitative" : "Quantitative"}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{ukDate(r.tested_at)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{ukDate(r.review_due_at)}</td>
                  <td className="px-4 py-2">{r.tester_name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.has_certificate && (
                      <a href={`/api/training-admin/face-fit/${r.id}`} target="_blank" rel="noreferrer" className="mr-3 text-blue-600 hover:underline">
                        Certificate
                      </a>
                    )}
                    {canRecord && (
                      <button type="button" onClick={() => remove(r.id)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
