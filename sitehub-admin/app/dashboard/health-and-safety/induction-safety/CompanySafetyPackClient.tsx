"use client";

import { useEffect, useState } from "react";
import InductionSafetyEditor, { type SafetySection } from "./InductionSafetyEditor";

export default function CompanySafetyPackClient({ canEdit }: { canEdit: boolean }) {
  const [sections, setSections] = useState<SafetySection[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/induction/safety-template", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSections(Array.isArray(d.sections) ? d.sections : []))
      .catch(() => setError("Could not load the company safety pack."));
  }, []);

  async function save(next: SafetySection[]) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/induction/safety-template", {
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
      setMessage("Company default saved. Existing sites keep their own copy until you reset them.");
    } finally {
      setSaving(false);
    }
  }

  if (!sections) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  return (
    <InductionSafetyEditor
      key={sections.map((s) => s.id).join("-")}
      initialSections={sections}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
      message={message}
      error={error}
    />
  );
}
