"use client";

import { useEffect, useState, useRef } from "react";
import { ScrollText, Plus, Pencil, Trash2, HardHat, AlertTriangle, Users, Paperclip } from "lucide-react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

const CATEGORIES = [
  { id: "PPE", label: "PPE", icon: HardHat, desc: "Personal protective equipment requirements" },
  { id: "emergency", label: "Emergency Procedures", icon: AlertTriangle, desc: "Evacuation, first aid, incident reporting" },
  { id: "conduct", label: "Conduct", icon: Users, desc: "Site behaviour and general conduct rules" },
] as const;

type Rule = { id: string; category: string; title: string; description: string; file_url?: string };

export default function SiteRulesManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ category: "PPE", title: "", description: "" });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      let rule = data.rule;
      if (form.category === "emergency" && uploadFile) {
        setUploading(true);
        try {
          const fd = new FormData();
          fd.append("ruleId", rule.id);
          fd.append("file", uploadFile);
          const upRes = await fetch("/api/site-rules/upload", {
            method: "POST",
            body: fd,
            credentials: "include",
          });
          const upData = await upRes.json();
          if (upData.file_url) rule = { ...rule, file_url: upData.file_url };
        } finally {
          setUploading(false);
        }
      }
      setRules((prev) => [...prev, rule]);
      setAdding(false);
      setForm({ category: "PPE", title: "", description: "" });
      setUploadFile(null);
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
    let updated = { ...editing, category: form.category, title: form.title, description: form.description };
    if (form.category === "emergency" && uploadFile) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("ruleId", editing.id);
        fd.append("file", uploadFile);
        const upRes = await fetch("/api/site-rules/upload", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const upData = await upRes.json();
        if (upData.file_url) updated = { ...updated, file_url: upData.file_url };
      } finally {
        setUploading(false);
      }
    }
    setRules((prev) => prev.map((r) => (r.id === editing.id ? updated : r)));
    setEditing(null);
    setForm({ category: "PPE", title: "", description: "" });
    setUploadFile(null);
  }

  async function uploadForRule(ruleId: string, file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("ruleId", ruleId);
      fd.append("file", file);
      const res = await fetch("/api/site-rules/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (data.file_url) {
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, file_url: data.file_url } : r))
        );
      } else {
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
          {form.category === "emergency" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Attach document (PDF)</label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-4 py-2"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={saveAdd} disabled={uploading}>{uploading ? "Saving…" : "Save"}</Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-slate-600 mb-6">
        Define site rules that operatives will see in the app. Add rules by category and optionally attach documents for emergency procedures.
      </p>

      <div className="space-y-8">
        {byCategory.map(({ id, label, icon: Icon, desc, rules: catRules }) => (
          <div key={id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <Icon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-900">{label}</h4>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </div>
            <div className="space-y-2">
              {catRules.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 p-6 text-center">
                  <p className="text-sm text-slate-500">No rules in this category yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Click &quot;Add Rule&quot; and select {label} to add one.</p>
                </div>
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
                      {form.category === "emergency" && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Attach/Replace document</label>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                            className="block w-full text-sm"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} disabled={uploading}>{uploading ? "Saving…" : "Save"}</Button>
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
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{rule.title}</p>
                        {rule.description && (
                          <p className="text-sm text-slate-600 mt-1">{rule.description}</p>
                        )}
                        {rule.file_url && (
                          <a
                            href={rule.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:underline"
                          >
                            View attached document
                          </a>
                        )}
                        {rule.category === "emergency" && (
                          <div className="mt-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadForRule(rule.id, f);
                              }}
                            />
                            <button
                              type="button"
                              disabled={uploading}
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              {rule.file_url ? "Replace document" : "Upload document"}
                            </button>
                          </div>
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
