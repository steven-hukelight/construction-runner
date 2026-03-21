"use client";
import { useState, useEffect } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useRouter } from "next/navigation";
import { createTask } from "./actions";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";

type Site = { id: string; name?: string };
type User = { id: string; display_name?: string; name?: string; email?: string };

export default function AddTaskModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    title: "",
    siteId: "",
    assignedToIds: [] as string[],
    dueDate: "",
  });

  useEffect(() => {
    if (!open) return;
    const companyId = getCompanyIdFromClient();
    Promise.all([
      fetch("/api/sites", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch(companyId ? `/api/users?companyId=${companyId}` : "/api/users", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : []
      ),
    ]).then(([sitesData, usersData]) => {
      setSites(Array.isArray(sitesData) ? sitesData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    });
  }, [open]);

  function toggleAssignee(id: string) {
    setForm((f) => ({
      ...f,
      assignedToIds: f.assignedToIds.includes(id)
        ? f.assignedToIds.filter((x) => x !== id)
        : [...f.assignedToIds, id],
    }));
  }

  async function handleSubmit() {
    await createTask({
      ...form,
      assignedToIds: form.assignedToIds,
    });
    setOpen(false);
    setForm({ title: "", siteId: "", assignedToIds: [], dueDate: "" });
    router.refresh();
  }

  const userName = (u: User) => u.display_name ?? u.name ?? u.email?.split("@")[0] ?? u.id;

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen((v) => !v)}>{open ? "Close" : "Add Task"}</Button>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-xl lg:max-w-2xl card shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4 sm:mb-6">Add Task</h3>
            <div className="space-y-4 sm:space-y-5">
            <Input
              label="Title"
              value={form.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Site</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.siteId}
                onChange={(e) => setForm({ ...form, siteId: e.target.value })}
              >
                <option value="">Select site...</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name ?? s.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assigned To (select multiple)</label>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1">
                    <input
                      type="checkbox"
                      checked={form.assignedToIds.includes(u.id)}
                      onChange={() => toggleAssignee(u.id)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">{userName(u)}</span>
                  </label>
                ))}
                {users.length === 0 && <p className="text-sm text-slate-500 py-2">No operatives found</p>}
              </div>
            </div>
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, dueDate: e.target.value })}
            />
            <div className="pt-2">
              <Button onClick={handleSubmit} className="w-full">
                Save Task
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
