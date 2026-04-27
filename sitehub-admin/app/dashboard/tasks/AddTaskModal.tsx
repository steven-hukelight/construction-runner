"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar, X } from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useRouter } from "next/navigation";
import { createTask } from "./actions";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";

type Site = { id: string; name?: string };
type User = { id: string; display_name?: string; name?: string; email?: string };

export default function AddTaskModal({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const dueDateRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const el = dueDateRef.current;
    if (!el) return;
    try {
      // showPicker() opens the native calendar on Chrome 99+, Edge, Firefox 101+, Safari 16+
      (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      el.focus();
    }
  };
  const [form, setForm] = useState({
    title: "",
    description: "",
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
    try {
      await createTask({
        ...form,
        assignedToIds: form.assignedToIds,
      });
      setOpen(false);
      setForm({ title: "", description: "", siteId: "", assignedToIds: [], dueDate: "" });
      onSuccess?.();
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create task");
    }
  }

  const userName = (u: User) => u.display_name ?? u.name ?? u.email?.split("@")[0] ?? u.id;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const modal =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-modal-title"
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={close}
          aria-hidden
        />
        <div className="relative z-10 w-full max-w-xl lg:max-w-2xl card shadow-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4 sm:mb-6">
            <h3 id="add-task-modal-title" className="text-base sm:text-lg font-semibold text-slate-900 pr-2">
              Add Task
            </h3>
            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              aria-label="Close"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
          <div className="space-y-4 sm:space-y-5">
            <Input
              label="Title"
              value={form.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Full task details..."
              />
            </div>
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
              <button
                type="button"
                onClick={openDatePicker}
                className="relative flex items-center w-full text-left cursor-pointer"
              >
                <Calendar className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  ref={dueDateRef}
                  type="date"
                  value={form.dueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, dueDate: e.target.value })}
                  onClick={(e) => {
                    e.stopPropagation();
                    openDatePicker();
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </button>
              <p className="mt-1 text-xs text-slate-500">Click to open calendar picker</p>
            </div>
            <div className="pt-2">
              <Button onClick={handleSubmit} className="w-full">
                Save Task
              </Button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Add Task
      </Button>
      {modal}
    </>
  );
}
