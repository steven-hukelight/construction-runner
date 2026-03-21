"use client";

import { useEffect, useState } from "react";
import { ScrollText, Plus, Pencil, Trash2 } from "lucide-react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

const CATEGORIES = [
  { id: "PPE", label: "PPE" },
  { id: "emergency", label: "Emergency Procedures" },
  { id: "conduct", label: "Conduct" },
] as const;

type Rule = { id: string; category: string; title: string; description: string };

export default function SiteRulesManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ category: "PPE", title: "", description: "" });

  useEffect(() => {
    fetch("/api/site-rules", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function saveAdd() {
    if (!form.title.trim()) return;
    const res = await fetch("/api/site-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
      credentials: "include",
    });
    const data = await res.json();
    if (data.rule) {
      setRules((prev) => [...prev, data.rule]);
      setAdding(false);
      setForm({ category: "PPE", title: "", description: "" });
    }
  }

  async function saveEdit() {
    if (!editing) return;
    await fetch("/api/site-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, ...form }),
      credentials: "include",
    });
    setRules((prev) =>
      prev.map((r) =>
        r.id === editing.id
          ? { ...r, category: form.category, title: form.title, description: form.description }
          : r
      )
    );
    setEditing(null);
    setForm({ category: "PPE", title: "", description: "" });
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this rule?")) return;
    await fetch(`/api/site-rules?id=${id}`, { method: "DELETE", credentials: "include" });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    rules: rules.filter((r) => r.category === c.id),
  }));

  if (loading) return <div className="card p-8 text-center text-slate-500">Loading…</div>;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
            <ScrollText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Site Rules</h3>
            <p className="text-sm text-slate-600">
              PPE, emergency procedures, and conduct. Edit to customize for your company.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setAdding(true);
            setEditing(null);
            setForm({ category: "PPE", title: "", description: "" });
          }}
        >
          <Plus size={18} /> Add Rule
        </Button>
      </div>

      {adding && (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
          <h4 className="font-medium text-slate-900">New Rule</h4>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-5 py-3.5 bg-white/90 border border-gray-200/80 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Title"
            value={form.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, title: e.target.value }))
            }
            placeholder="e.g. Hard hat required"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Optional details"
          />
          <div className="flex gap-2">
            <Button onClick={saveAdd}>Save</Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {byCategory.map(({ id, label, rules: catRules }) => (
          <div key={id}>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">{label}</h4>
            <div className="space-y-2">
              {catRules.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">No rules yet.</p>
              ) : (
                catRules.map((rule) =>
                  editing?.id === rule.id ? (
                    <div
                      key={rule.id}
                      className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3"
                    >
                      <select
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="block w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                      <input
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        className="block w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="Title"
                      />
                      <input
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        className="block w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="Description"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={rule.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{rule.title}</p>
                        {rule.description && (
                          <p className="text-sm text-slate-600 mt-1">{rule.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(rule);
                            setForm({
                              category: rule.category,
                              title: rule.title,
                              description: rule.description,
                            });
                          }}
                          className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(rule.id)}
                          className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
