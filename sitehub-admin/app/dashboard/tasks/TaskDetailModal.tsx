"use client";

import { useEffect, useState } from "react";
import { X, Paperclip, FileText, Image as ImageIcon } from "lucide-react";
import Button from "../components/ui/Button";
import { openDocumentUrl } from "@/lib/openDocumentUrl";
import { TaskStatusPill } from "../components/ui/TaskStatusPill";
import { formatDate } from "@/app/DisplayPreferencesProvider";

type Task = {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  site_name?: string;
  site_id?: string;
  siteId?: string;
  due_date?: string;
  dueDate?: string;
  assigned_to_names?: string[];
  attachments?: { id: string; file_url: string; file_name?: string; file_type?: string }[];
};

type Attachment = { id: string; file_url: string; file_name?: string; file_type?: string };

export default function TaskDetailModal({
  task,
  onClose,
  onStatusChange,
  onDelete,
}: {
  task: Task | null;
  onClose: () => void;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!task?.id) return;
    const fromTask = (task.attachments ?? []).map((a) => ({
      id: a.id,
      file_url: a.file_url,
      file_name: a.file_name,
      file_type: a.file_type,
    }));
    setAttachments(fromTask);
    fetch(`/api/tasks/${task.id}/upload`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => setAttachments(Array.isArray(arr) ? arr : fromTask))
      .catch(() => {});
  }, [task?.id, task?.attachments]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !task?.id) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/tasks/${task.id}/upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (res.ok) {
        const { attachment } = await res.json();
        setAttachments((prev) => [...prev, attachment]);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Upload failed");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (!task) return null;

  const siteName = task.site_name ?? task.site_id ?? task.siteId ?? "—";
  const dueDate = task.due_date ?? task.dueDate;
  const assigned = task.assigned_to_names?.join(", ") ?? "—";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-2xl card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{task.title || "Untitled Task"}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <TaskStatusPill status={task.status} />
              <span className="text-sm text-slate-500">Site: {siteName}</span>
              {dueDate && (
                <span className="text-sm text-slate-500">Due: {formatDate(new Date(dueDate))}</span>
              )}
              <span className="text-sm text-slate-500">Assigned: {assigned}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {task.description && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Description</h4>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Attachments
          </h4>
          <div className="space-y-2">
            {attachments.map((a) => {
              const isImage = (a.file_type ?? "").startsWith("image/");
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50"
                >
                  {isImage ? (
                    <ImageIcon className="w-5 h-5 text-slate-500 shrink-0" aria-hidden />
                  ) : (
                    <FileText className="w-5 h-5 text-slate-500 shrink-0" />
                  )}
                  <span className="text-sm truncate flex-1">{a.file_name || "File"}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openDocumentUrl(a.file_url)}
                  >
                    View
                  </Button>
                </div>
              );
            })}
            {attachments.length === 0 && !uploading && (
              <p className="text-sm text-slate-500 py-2">No attachments yet.</p>
            )}
          </div>
          <label className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
            <Paperclip className="w-4 h-4" />
            {uploading ? "Uploading…" : "Add image or document"}
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="sr-only"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
          {onStatusChange && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onStatusChange(task.id, "OPEN")}
              >
                Open
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onStatusChange(task.id, "IN_PROGRESS")}
              >
                In progress
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onStatusChange(task.id, "DONE")}
              >
                Done
              </Button>
            </>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="secondary"
              className="text-red-600 hover:bg-red-50"
              onClick={() => {
                if (window.confirm("Delete this task?")) {
                  onDelete(task.id);
                  onClose();
                }
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
