"use client";

import { useCallback, useEffect, useState } from "react";
import ModulesPanel from "./ModulesPanel";
import PeoplePanel from "./PeoplePanel";
import FaceFitPanel from "./FaceFitPanel";
import CampaignsPanel from "./CampaignsPanel";
import { readError, type CatalogueResponse } from "./types";

const SECTIONS = [
  { id: "modules", label: "Modules" },
  { id: "people", label: "Who has passed" },
  { id: "face-fit", label: "Face fit" },
  { id: "campaigns", label: "Campaigns" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

export default function TrainingClient() {
  const [section, setSection] = useState<Section>("modules");
  const [catalogue, setCatalogue] = useState<CatalogueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/training-admin", { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      setError(await readError(res, "Couldn't load training"));
      return;
    }
    setError(null);
    setCatalogue((await res.json()) as CatalogueResponse);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`rounded-full px-3 py-1 text-sm ${section === s.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!catalogue && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {catalogue && section === "modules" && <ModulesPanel catalogue={catalogue} onChanged={load} />}
      {catalogue && section === "people" && <PeoplePanel />}
      {catalogue && section === "face-fit" && (
        <FaceFitPanel
          canRecord={catalogue.canRecord}
          faceFitOn={catalogue.modules.some((m) => m.kind === "record" && m.enabled)}
        />
      )}
      {catalogue && section === "campaigns" && <CampaignsPanel canRecord={catalogue.canRecord} />}
    </div>
  );
}
