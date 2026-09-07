"use client";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useRouter } from "next/navigation";
import { createTask } from "./actions";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";
import { SitePicker, DueDateCalendar } from "./AddTaskPickers";

type Site = { id: string; name?: string };
type User = { id: string; display_name?: string; name?: string; email?: string };

export default function AddTaskModal({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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

  useEffect(() => {
    if (!open) return;
    setForm({
      title: "",
      description: "",
      siteId: "",
      assignedToIds: [],
      dueDate: "",
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
        className="fixed inset-0 z-[10050] flex items-start justify-center overflow-y-auto p-4 py-8 sm:py-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-modal-title"
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={close}
          aria-hidden
        />
        <div className="relative z-10 flex min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-[inherit] lg:max-w-2xl card shadow-2xl max-h-[min(90vh,720px)] my-auto shrink-0">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80 sm:px-6">
            <h3 id="add-task-modal-title" className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 pr-2">
              Add Task
            </h3>
            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              aria-label="Close"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
          {/* Single scroll region so header stays put and Save is always reachable on short viewports */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:pb-5">
            <div className="space-y-4 sm:space-y-5">
            <Input
              label="Title"
              value={form.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (optional)</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                rows={3}
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Full task details..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Assigned To (select multiple)</label>
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg p-2 space-y-1">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-2 py-1">
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Site</label>
              <SitePicker sites={sites} value={form.siteId} onChange={(id) => setForm((f) => ({ ...f, siteId: id }))} />
            </div>
            <div>
              <span className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Due date (optional)</span>
              <DueDateCalendar valueYmd={form.dueDate} onChangeYmd={(dueDate) => setForm((f) => ({ ...f, dueDate }))} />
            </div>
            <div className="pt-1">
              <Button onClick={handleSubmit} className="w-full">
                Save Task
              </Button>
            </div>
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
