"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/app/dashboard/components/ui/Button";
import Input from "@/app/dashboard/components/ui/Input";

export type SafetySection = { id: string; title: string; body: string };

export default function InductionSafetyEditor({
  initialSections,
  canEdit,
  onSave,
  onReset,
  saving,
  message,
  error,
}: {
  initialSections: SafetySection[];
  canEdit: boolean;
  onSave: (sections: SafetySection[]) => void;
  onReset?: () => void;
  saving: boolean;
  message?: string | null;
  error?: string | null;
}) {
  const [sections, setSections] = useState<SafetySection[]>(initialSections);

  function update(index: number, patch: Partial<SafetySection>) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <div
          key={section.id || index}
          className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Input
                label="Section title"
                value={section.title}
                disabled={!canEdit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(index, { title: e.target.value })}
              />
            </div>
            {canEdit && (
              <button
                type="button"
                className="mt-7 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                onClick={() => setSections((prev) => prev.filter((_, i) => i !== index))}
                aria-label="Remove section"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Content</label>
          <textarea
            value={section.body}
            disabled={!canEdit}
            rows={5}
            onChange={(e) => update(index, { body: e.target.value })}
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-[#1A1A1A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      ))}

      {canEdit && (
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setSections((prev) => [
              ...prev,
              { id: `section-${Date.now()}`, title: "", body: "" },
            ])
          }
        >
          <Plus size={16} />
          Add section
        </Button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}

      {canEdit && (
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => onSave(sections)} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {onReset && (
            <Button type="button" variant="secondary" onClick={onReset} disabled={saving}>
              Reset to company default
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
