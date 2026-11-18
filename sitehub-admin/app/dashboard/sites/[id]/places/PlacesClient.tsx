"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ChevronRight, FileText, MapPin, Smartphone, Trash2, Upload, Users } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { namesFromPlaceCsv, placeGroupLabel, plotRunNames } from "@/lib/worklog/rules";

type NameRow = { id: string; name: string };
type Segment = {
  id: string;
  person: string;
  placeName: string;
  activityName: string;
  startedAt: string;
  endedAt: string | null;
};
type Board = { rows: Segment[]; missing: NameRow[] };

function hm(iso: string | null): string {
  if (!iso) return "Now";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const CSV_TEMPLATE = "Block,Core,Plot\nBlock D,1,1\nBlock D,1,2\n";

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "places-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlacesClient({ siteId, canEdit: canEditStart }: { siteId: string; canEdit: boolean }) {
  const [places, setPlaces] = useState<NameRow[]>([]);
  const [activities, setActivities] = useState<NameRow[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [placeText, setPlaceText] = useState("");
  const [activityText, setActivityText] = useState("");
  const [log, setLog] = useState({ userId: "", placeId: "", activityId: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(canEditStart);

  const load = useCallback(async () => {
    const res = await fetch(`/api/work-log?siteId=${encodeURIComponent(siteId)}`, { credentials: "include", cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      places?: NameRow[];
      activities?: NameRow[];
      board?: Board | null;
      canEdit?: boolean;
    };
    if (!res.ok) {
      setError(body.error || "Couldn't load places");
      return;
    }
    setError(null);
    setPlaces(body.places ?? []);
    setActivities(body.activities ?? []);
    setBoard(body.board ?? null);
    if (typeof body.canEdit === "boolean") setCanEdit(body.canEdit);
  }, [siteId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function save(action: "add-places" | "add-activities", names: string | string[]) {
    setBusy(action);
    try {
      const res = await fetch("/api/work-log", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, siteId, names }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; count?: number };
      if (!res.ok) {
        toast.error(body.error || "Couldn't save");
        return;
      }
      if (action === "add-places") setPlaceText("");
      else setActivityText("");
      toast.success(typeof body.count === "number" ? `Saved ${body.count}` : "Saved");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function remove(action: "remove-place" | "remove-activity", id: string, name: string) {
    if (!window.confirm(`Remove “${name}”? It will leave the list people pick on the phone.`)) return;
    setBusy(`${action}:${id}`);
    try {
      const res = await fetch("/api/work-log", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, siteId, id }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error || "Couldn't remove that");
        return;
      }
      toast.success("Removed");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function logPerson() {
    setBusy("start");
    try {
      const res = await fetch("/api/work-log", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", siteId, ...log }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error || "Couldn't log that visit");
        return;
      }
      toast.success("Logged");
      setLog({ userId: "", placeId: "", activityId: "" });
      await load();
    } finally {
      setBusy(null);
    }
  }

  const catalogueReady = places.length > 0 && activities.length > 0;
  const missing = board?.missing ?? [];
  const byPlace = new Map<string, Segment[]>();
  for (const row of board?.rows ?? []) {
    const list = byPlace.get(row.placeName) ?? [];
    list.push(row);
    byPlace.set(row.placeName, list);
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="grid gap-3 md:grid-cols-3">
        <HowStep
          n="1"
          icon={MapPin}
          title="You name the places"
          body="Add a plot run per block or core. Import a CSV or a text PDF. Paste infrastructure as one-offs."
        />
        <HowStep
          n="2"
          icon={Smartphone}
          title="They pick after sign-in"
          body="The phone asks “Where are you?” It does not change the sign-in clock."
        />
        <HowStep
          n="3"
          icon={Users}
          title="You see who was where"
          body="Today’s visits sit on this page, grouped by place. It is not a timesheet."
        />
      </section>

      {canEdit && catalogueReady && missing.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Signed in with no place</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            These people are on site. Put them on a place if they missed the phone prompt.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={log.userId}
              onChange={(e) => setLog((s) => ({ ...s, userId: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Person</option>
              {missing.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={log.placeId}
              onChange={(e) => setLog((s) => ({ ...s, placeId: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Place</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={log.activityId}
              onChange={(e) => setLog((s) => ({ ...s, activityId: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Activity</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={() => void logPerson()} disabled={!!busy || !log.userId || !log.placeId || !log.activityId}>
            Log this visit
          </Button>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Today</h2>
          <p className="text-sm text-slate-500">Who was on which place, from the phone picks and any office logs.</p>
        </div>
        {!catalogueReady && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
            Add at least one place and one activity below. Until then the phone has nothing to offer after sign-in.
          </p>
        )}
        {catalogueReady && !(board?.rows.length) && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
            Nobody has picked a place yet today. After they sign in, the phone asks “Where are you?”
          </p>
        )}
        {[...byPlace.entries()].map(([place, rows]) => (
          <div key={place} className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold dark:border-slate-700">{place}</div>
            <table className="min-w-full text-sm">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2">{r.person}</td>
                    <td className="px-4 py-2">{r.activityName}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                      {hm(r.startedAt)} – {hm(r.endedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">The list people pick from</h2>
          <p className="text-sm text-slate-500">
            Add each block or core as a number run. Infrastructure and one-offs can still be pasted. You cannot remove a
            name that already has visits.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <PlaceSetup
            siteId={siteId}
            rows={places}
            text={placeText}
            onText={setPlaceText}
            canEdit={canEdit}
            busy={busy}
            onPaste={() => void save("add-places", placeText)}
            onImport={(names) => void save("add-places", names)}
            onRemove={(id, name) => void remove("remove-place", id, name)}
            onReload={load}
            setBusy={setBusy}
          />
          <NameEditor
            title="Activities"
            hint="A short label for what they were doing. Keep this list small."
            placeholder={"1st fix\n2nd fix\nContainment"}
            rows={activities}
            text={activityText}
            onText={setActivityText}
            canEdit={canEdit}
            empty="No activities yet."
            adding={busy === "add-activities"}
            onAdd={() => void save("add-activities", activityText)}
            onRemove={(id, name) => void remove("remove-activity", id, name)}
            removingId={busy?.startsWith("remove-activity:") ? busy.slice("remove-activity:".length) : null}
          />
        </div>
      </section>
    </div>
  );
}

function HowStep({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: string;
  icon: typeof MapPin;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">{n}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/12 text-blue-700 dark:text-blue-300">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}

function PlaceSetup({
  siteId,
  rows,
  text,
  onText,
  canEdit,
  busy,
  onPaste,
  onImport,
  onRemove,
  onReload,
  setBusy,
}: {
  siteId: string;
  rows: NameRow[];
  text: string;
  onText: (value: string) => void;
  canEdit: boolean;
  busy: string | null;
  onPaste: () => void;
  onImport: (names: string[]) => void;
  onRemove: (id: string, name: string) => void;
  onReload: () => Promise<void>;
  setBusy: (value: string | null) => void;
}) {
  const [block, setBlock] = useState("");
  const [core, setCore] = useState("");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("");
  const [pad, setPad] = useState(false);
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [importNames, setImportNames] = useState<string[] | null>(null);
  const [importFile, setImportFile] = useState("");
  const [importKind, setImportKind] = useState<"csv" | "pdf">("csv");

  const preview = useMemo(
    () => plotRunNames({ block, core, from: Number(from), to: Number(to), pad }),
    [block, core, from, to, pad],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? rows.filter((row) => row.name.toLowerCase().includes(q)) : rows;
    const map = new Map<string, NameRow[]>();
    for (const row of filtered) {
      const label = placeGroupLabel(row.name);
      const list = map.get(label) ?? [];
      list.push(row);
      map.set(label, list);
    }
    for (const items of map.values()) {
      items.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true }))
      .map(([label, items]) => ({ label, items }));
  }, [rows, query]);

  async function previewPdf(file: File) {
    if (file.size > 4.5 * 1024 * 1024) {
      toast.error("That PDF is too large. Save it as CSV, or use a smaller file.");
      return;
    }
    setBusy("preview-pdf");
    try {
      const form = new FormData();
      form.append("siteId", siteId);
      form.append("file", file);
      const res = await fetch("/api/work-log/preview-pdf", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; names?: string[] };
      if (!res.ok) {
        toast.error(body.error || "Couldn't read that PDF");
        return;
      }
      const names = Array.isArray(body.names) ? body.names.filter((name) => typeof name === "string" && name.trim()) : [];
      if (!names.length) {
        toast.error("No plots in that PDF. Use a text PDF (not a scan), or CSV.");
        return;
      }
      setImportKind("pdf");
      setImportFile(file.name);
      setImportNames(names);
    } finally {
      setBusy(null);
    }
  }

  async function addRun() {
    if (!preview.length) {
      toast.error("Check the plot numbers");
      return;
    }
    setBusy("add-plot-run");
    try {
      const res = await fetch("/api/work-log", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-plot-run",
          siteId,
          block,
          core,
          from: Number(from),
          to: Number(to),
          pad,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; count?: number };
      if (!res.ok) {
        toast.error(body.error || "Couldn't save");
        return;
      }
      toast.success(`Added ${body.count ?? preview.length} plots`);
      await onReload();
    } finally {
      setBusy(null);
    }
  }

  async function removeGroup(label: string, items: NameRow[]) {
    if (!window.confirm(`Remove ${items.length} names in ${label}? Names with visits stay.`)) return;
    setBusy(`remove-group:${label}`);
    try {
      const res = await fetch("/api/work-log", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-places", siteId, ids: items.map((row) => row.id) }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; removed?: number; kept?: number };
      if (!res.ok) {
        toast.error(body.error || "Couldn't remove that");
        return;
      }
      const kept = body.kept ?? 0;
      toast.success(kept ? `Removed ${body.removed}. ${kept} still have visits.` : `Removed ${body.removed}`);
      await onReload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Places</h3>
      {canEdit && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Add a plot run</p>
          <p className="text-sm text-slate-500">One run per block or core. Repeat for the next core. Existing names are skipped.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Block" value={block} onChange={(e: ChangeEvent<HTMLInputElement>) => setBlock(e.target.value)} placeholder="Block D" />
            <Input label="Core (optional)" value={core} onChange={(e: ChangeEvent<HTMLInputElement>) => setCore(e.target.value)} placeholder="1" />
            <Input label="From" type="number" min={0} value={from} onChange={(e: ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)} />
            <Input label="To" type="number" min={0} value={to} onChange={(e: ChangeEvent<HTMLInputElement>) => setTo(e.target.value)} placeholder="110" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={pad} onChange={(e) => setPad(e.target.checked)} />
            Pad numbers (01, 02)
          </label>
          <p className="text-sm text-slate-500">
            {preview.length
              ? `${preview[0]} … ${preview[preview.length - 1]} (${preview.length} plots)`
              : "Enter from and to, then add the run."}
          </p>
          <Button size="sm" onClick={() => void addRun()} disabled={busy === "add-plot-run" || !preview.length}>
            {busy === "add-plot-run" ? "Saving…" : preview.length ? `Add ${preview.length} plots` : "Add plots"}
          </Button>
        </div>
      )}
      {canEdit && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Import from CSV or PDF</p>
          <p className="text-sm text-slate-500">
            Excel should be saved as CSV. A text PDF of a plot list works too. Scanned drawings usually have no text — use CSV then. Existing names are skipped.
          </p>
          {importNames && importNames.length > 0 ? (
            <>
              <p className="text-sm text-slate-600">
                {importFile ? `${importFile}: ` : ""}
                {importNames[0]}
                {importNames.length > 1 ? ` … ${importNames[importNames.length - 1]}` : ""} ({importNames.length} names)
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onImport(importNames);
                    setImportNames(null);
                    setImportFile("");
                  }}
                  disabled={busy === "add-places"}
                >
                  {busy === "add-places"
                    ? "Saving…"
                    : `Add ${importNames.length} from ${importKind === "pdf" ? "PDF" : "CSV"}`}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setImportNames(null);
                    setImportFile("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
                <Upload className="h-4 w-4" aria-hidden />
                Choose CSV
                <input
                  type="file"
                  accept=".csv,.txt,.tsv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    void file.text().then((raw) => {
                      const names = namesFromPlaceCsv(raw);
                      if (!names.length) {
                        toast.error("No plots in that CSV. Use a Name column, or Block, Core and Plot.");
                        return;
                      }
                      setImportKind("csv");
                      setImportFile(file.name);
                      setImportNames(names);
                    });
                  }}
                />
              </label>
              <label className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ${busy === "preview-pdf" ? "pointer-events-none opacity-50" : ""}`}>
                <FileText className="h-4 w-4" aria-hidden />
                {busy === "preview-pdf" ? "Reading PDF…" : "Choose PDF"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={busy === "preview-pdf"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    void previewPdf(file);
                  }}
                />
              </label>
              <Button size="sm" variant="secondary" onClick={downloadCsvTemplate}>
                Download template
              </Button>
            </div>
          )}
        </div>
      )}
      {canEdit && (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Infrastructure or a one-off. One per line.</p>
          <textarea
            value={text}
            onChange={(e) => onText(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder={"Drainage SW\nRoads\nShow home"}
          />
          <Button size="sm" onClick={onPaste} disabled={busy === "add-places" || !text.trim()}>
            {busy === "add-places" ? "Saving…" : "Add these"}
          </Button>
        </div>
      )}
      {rows.length > 12 && (
        <Input label="Find a plot" value={query} onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} placeholder="101" />
      )}
      <ul className="space-y-1.5">
        {groups.map((group) => {
          const open = openGroups[group.label] ?? (groups.length === 1 || Boolean(query.trim()));
          return (
            <li key={group.label} className="rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900">
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-slate-800 dark:text-slate-100"
                  onClick={() => setOpenGroups((s) => ({ ...s, [group.label]: !open }))}
                >
                  <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 ${open ? "rotate-90" : ""}`} />
                  <span className="truncate">{group.label}</span>
                  <span className="text-slate-500">{group.items.length}</span>
                </button>
                {canEdit && (
                  <button
                    type="button"
                    className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                    disabled={busy === `remove-group:${group.label}`}
                    onClick={() => void removeGroup(group.label, group.items)}
                  >
                    Remove
                  </button>
                )}
              </div>
              {open && (
                <ul className="border-t border-slate-100 dark:border-slate-700">
                  {group.items.map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{row.name}</span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onRemove(row.id, row.name)}
                          disabled={busy === `remove-place:${row.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                          aria-label={`Remove ${row.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        {!rows.length && <li className="text-sm text-slate-500">No places yet.</li>}
        {rows.length > 0 && !groups.length && <li className="text-sm text-slate-500">No matching plots.</li>}
      </ul>
    </div>
  );
}

function NameEditor({
  title,
  hint,
  placeholder,
  rows,
  text,
  onText,
  canEdit,
  empty,
  adding,
  onAdd,
  onRemove,
  removingId,
}: {
  title: string;
  hint: string;
  placeholder: string;
  rows: NameRow[];
  text: string;
  onText: (value: string) => void;
  canEdit: boolean;
  empty: string;
  adding: boolean;
  onAdd: () => void;
  onRemove: (id: string, name: string) => void;
  removingId: string | null;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-500">{hint}</p>
      {canEdit && (
        <>
          <textarea
            value={text}
            onChange={(e) => onText(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder={placeholder}
          />
          <Button size="sm" onClick={onAdd} disabled={adding || !text.trim()}>
            {adding ? "Saving…" : `Add ${title.toLowerCase()}`}
          </Button>
        </>
      )}
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            <span className="min-w-0 truncate text-slate-800 dark:text-slate-100">{row.name}</span>
            {canEdit && (
              <button
                type="button"
                onClick={() => onRemove(row.id, row.name)}
                disabled={removingId === row.id}
                className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                aria-label={`Remove ${row.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Remove
              </button>
            )}
          </li>
        ))}
        {!rows.length && <li className="text-sm text-slate-500">{empty}</li>}
      </ul>
    </div>
  );
}
