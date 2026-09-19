"use client";

import { useEffect, useState } from "react";
import InductionSafetyEditor, {
  type SafetySection,
} from "@/app/dashboard/health-and-safety/induction-safety/InductionSafetyEditor";

export default function SiteSafetyPackClient({
  siteId,
  canEdit,
}: {
  siteId: string;
  canEdit: boolean;
}) {
  const [sections, setSections] = useState<SafetySection[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sites/${siteId}/induction-safety?ensure=1`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => setSections(Array.isArray(d.sections) ? d.sections : []))
      .catch(() => setError("Could not load this site’s safety information."));
  }, [siteId]);

  async function save(next: SafetySection[]) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/induction-safety`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setSections(data.sections);
      setMessage("Site safety information saved.");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm("Replace this site’s safety information with the company default?")) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/induction-safety`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reset failed");
        return;
      }
      setSections(data.sections);
      setMessage("Reset to the company default.");
    } finally {
      setSaving(false);
    }
  }

  if (!sections) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <InductionSafetyEditor
      key={`${siteId}-${sections.map((s) => s.id).join("-")}`}
      initialSections={sections}
      canEdit={canEdit}
      onSave={save}
      onReset={canEdit ? reset : undefined}
      saving={saving}
      message={message}
      error={error}
    />
  );
}
