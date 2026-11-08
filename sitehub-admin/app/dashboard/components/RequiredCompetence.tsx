"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import Button from "./ui/Button";
import { CARD_TYPES, CSCS_LEVELS, TICKET_TYPES, type RequirementKind } from "@/lib/competence/rules";

type Item = { id?: string; kind: RequirementKind; code: string; level: string | null; label: string };

const OTHER_TICKET = "__other__";

/**
 * Cards and tickets a RAMS or task needs. The supervisor dashboard uses this list to show who
 * is on site without them. It never stops anyone signing in.
 */
export default function RequiredCompetence({
  subjectType,
  subjectId,
}: {
  subjectType: "rams" | "task";
  subjectId: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [kind, setKind] = useState<RequirementKind>("ticket");
  const [code, setCode] = useState<string>(TICKET_TYPES[0].code);
  const [level, setLevel] = useState("");
  const [otherName, setOtherName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const q = new URLSearchParams({ subjectType, subjectId });
      const res = await fetch(`/api/competence/requirements?${q}`, { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { requirements?: Item[]; canEdit?: boolean };
      setItems(Array.isArray(json.requirements) ? json.requirements : []);
      setCanEdit(json.canEdit === true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [subjectType, subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(next: Omit<Item, "label" | "id">[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/competence/requirements", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectType,
          subjectId,
          requirements: next.map((r) => ({ kind: r.kind, code: r.code, level: r.level })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : "Could not save");
        return false;
      }
      setItems(Array.isArray(json.requirements) ? json.requirements : []);
      return true;
    } catch {
      toast.error("Could not save");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function add() {
    const name = code === OTHER_TICKET ? otherName.trim() : code;
    if (!name) {
      toast.error("Type the ticket name");
      return;
    }
    const added = { kind, code: name, level: kind === "card" && code === "CSCS" && level ? level : null };
    if (await save([...items, added])) setOtherName("");
  }

  function changeKind(next: RequirementKind) {
    setKind(next);
    setLevel("");
    setCode(next === "card" ? "CSCS" : TICKET_TYPES[0].code);
  }

  const cardTypes = CARD_TYPES.filter((t) => t !== "Other");

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        Cards and tickets the people on this {subjectType === "rams" ? "RAMS" : "task"} need. The supervisor
        dashboard lists anyone on site without them. Nobody is blocked from signing in.
      </p>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {loadError ? <p className="text-sm text-amber-700">Could not load the requirements.</p> : null}
      {!loading && !loadError ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {items.length === 0 ? <span className="text-sm text-slate-500">None listed.</span> : null}
          {items.map((r, i) => (
            <span key={r.id ?? `${r.kind}-${r.code}-${r.level ?? ""}`} className="status-chip status-chip--info inline-flex items-center gap-1">
              {r.label}
              {canEdit ? (
                <button
                  type="button"
                  aria-label={`Remove ${r.label}`}
                  disabled={saving}
                  className="ml-0.5 rounded hover:bg-blue-100 disabled:opacity-50"
                  onClick={() => void save(items.filter((_, j) => j !== i))}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
      {canEdit && !loading && !loadError ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input w-auto"
            value={kind}
            onChange={(e) => changeKind(e.target.value as RequirementKind)}
            aria-label="Requirement type"
          >
            <option value="ticket">Ticket</option>
            <option value="card">Card</option>
          </select>
          <select className="input w-auto" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Card or ticket">
            {kind === "card"
              ? cardTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))
              : [
                  ...TICKET_TYPES.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  )),
                  <option key={OTHER_TICKET} value={OTHER_TICKET}>
                    Other…
                  </option>,
                ]}
          </select>
          {kind === "card" && code === "CSCS" ? (
            <select className="input w-auto" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="CSCS colour">
              <option value="">Any colour</option>
              {CSCS_LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          ) : null}
          {kind === "ticket" && code === OTHER_TICKET ? (
            <input
              className="input w-48"
              value={otherName}
              maxLength={80}
              placeholder="e.g. IPAF 3a"
              onChange={(e) => setOtherName(e.target.value)}
            />
          ) : null}
          <Button size="sm" variant="secondary" type="button" disabled={saving} onClick={() => void add()}>
            {saving ? "Saving…" : "Add"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
