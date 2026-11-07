"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { stageUpload } from "@/lib/client/stagedUpload";
import { readError, type CatalogueModule, type CatalogueResponse } from "./types";

const REFRESH_OPTIONS = [
  { value: "12", label: "Every 12 months" },
  { value: "24", label: "Every 24 months" },
  { value: "36", label: "Every 36 months" },
  { value: "off", label: "No refresh" },
];

export default function ModulesPanel({ catalogue, onChanged }: { catalogue: CatalogueResponse; onChanged: () => Promise<void> }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [choosingSites, setChoosingSites] = useState<string | null>(null);

  async function patchSettings(
    module: CatalogueModule,
    body: { enabled?: boolean; refreshMonths?: number | null; scope?: "company" | "sites"; siteIds?: string[] },
  ): Promise<boolean> {
    setSaving(module.id);
    try {
      const res = await fetch(`/api/training-admin/modules/${module.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error(await readError(res, "Couldn't save"));
        return false;
      }
      await onChanged();
      return true;
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        A module turned on applies to everyone in the company, or only to people on the sites you choose. Operatives watch the video, then answer five questions. Four
        right is a pass. A module needs a video or PDF before it can be turned on. Upload your own MP4 (under 50 MB) or,
        where there is no video, a PDF (under 20 MB) for people to read instead. The questions stay the same, so cover the
        same points.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Module</th>
              <th className="px-4 py-2 font-medium">Video</th>
              <th className="px-4 py-2 font-medium">Refresh</th>
              <th className="px-4 py-2 font-medium">Applies to</th>
              <th className="px-4 py-2 font-medium">On</th>
            </tr>
          </thead>
          <tbody>
            {catalogue.modules.map((m) => (
              <ModuleRow
                key={m.id}
                module={m}
                canConfigure={catalogue.canConfigure}
                canEditCatalogue={catalogue.canEditCatalogue}
                busy={saving === m.id}
                editing={editing === m.id}
                sites={catalogue.sites}
                choosingSites={choosingSites === m.id}
                onChooseSites={() => setChoosingSites(choosingSites === m.id ? null : m.id)}
                onScope={async (scope, siteIds) => {
                  if (await patchSettings(m, { scope, siteIds })) setChoosingSites(null);
                }}
                onEdit={() => setEditing(editing === m.id ? null : m.id)}
                onToggle={(enabled) => patchSettings(m, { enabled })}
                onRefresh={(value) => patchSettings(m, { refreshMonths: value === "off" ? null : Number(value) })}
                onCatalogueSaved={async () => {
                  setEditing(null);
                  await onChanged();
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
      {!catalogue.canConfigure && (
        <p className="text-xs text-slate-500">Only a Super Admin can turn modules on or change the refresh period.</p>
      )}
    </div>
  );
}

function ModuleRow({
  module: m,
  canConfigure,
  canEditCatalogue,
  busy,
  editing,
  sites,
  choosingSites,
  onChooseSites,
  onScope,
  onEdit,
  onToggle,
  onRefresh,
  onCatalogueSaved,
}: {
  module: CatalogueModule;
  canConfigure: boolean;
  canEditCatalogue: boolean;
  busy: boolean;
  editing: boolean;
  sites: { id: string; name: string }[];
  choosingSites: boolean;
  onChooseSites: () => void;
  onScope: (scope: "company" | "sites", siteIds: string[]) => Promise<void>;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
  onRefresh: (value: string) => void;
  onCatalogueSaved: () => Promise<void>;
}) {
  const isRecord = m.kind === "record";
  const sourceLabel = isRecord
    ? "In-person test, logged by the office"
    : m.source === "company"
      ? `Your ${m.companyMaterial?.type === "document" ? "PDF" : "video"}: ${m.companyMaterial?.name}`
      : m.source === "video"
        ? "Default video"
        : m.source === "link"
          ? `${m.publisher || "Publisher"} page`
          : "No video yet";

  return (
    <>
      <tr className="border-t border-slate-100 align-top">
        <td className="px-4 py-3">
          <div className="font-medium text-slate-900">{m.title}</div>
          <div className="text-xs text-slate-500">{m.summary}</div>
          {!isRecord && (
            <div className="mt-1 text-xs text-slate-400">
              {m.minutes ? `About ${m.minutes} min · ` : ""}
              {m.questionCount} questions
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={m.ready ? "text-slate-700" : "text-amber-700"}>{sourceLabel}</span>
          {m.source === "link" && m.externalUrl && (
            <a href={m.externalUrl} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 hover:underline">
              Open page
            </a>
          )}
          {canConfigure && !isRecord && <CompanyMaterialControl module={m} onChanged={onCatalogueSaved} />}
          {canEditCatalogue && !isRecord && (
            <button type="button" onClick={onEdit} className="block text-xs text-slate-500 hover:underline">
              {editing ? "Close" : "Set default for every company"}
            </button>
          )}
        </td>
        <td className="px-4 py-3">
          {isRecord ? (
            <span className="text-xs text-slate-500">Review date on each record</span>
          ) : (
            <select
              value={m.refreshMonths == null ? "off" : String(m.refreshMonths)}
              disabled={!canConfigure || busy}
              onChange={(e) => onRefresh(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
            >
              {REFRESH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              {m.refreshMonths != null && !REFRESH_OPTIONS.some((o) => o.value === String(m.refreshMonths)) && (
                <option value={String(m.refreshMonths)}>Every {m.refreshMonths} months</option>
              )}
            </select>
          )}
        </td>
        <td className="px-4 py-3">
          <select
            value={m.scope}
            disabled={!canConfigure || busy}
            onChange={(e) => {
              if (e.target.value === "company") void onScope("company", []);
              else if (!choosingSites) onChooseSites();
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            <option value="company">Whole company</option>
            <option value="sites">Chosen sites</option>
          </select>
          {m.scope === "sites" && (
            <div className="mt-1 text-xs text-slate-500">{siteSummary(m.siteIds, sites)}</div>
          )}
          {canConfigure && m.scope === "sites" && (
            <button type="button" onClick={onChooseSites} className="block text-xs text-blue-600 hover:underline">
              {choosingSites ? "Close" : "Change sites"}
            </button>
          )}
        </td>
        <td className="px-4 py-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={m.enabled}
              disabled={!canConfigure || busy || (!m.ready && !m.enabled)}
              onChange={(e) => onToggle(e.target.checked)}
            />
            <span className="text-sm">{m.enabled ? "On" : "Off"}</span>
          </label>
        </td>
      </tr>
      {choosingSites && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={5} className="px-4 py-4">
            <SitePicker
              sites={sites}
              initial={m.scope === "sites" ? m.siteIds : []}
              busy={busy}
              onCancel={onChooseSites}
              onSave={(siteIds) => onScope("sites", siteIds)}
            />
          </td>
        </tr>
      )}
      {editing && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={5} className="px-4 py-4">
            <CatalogueVideoForm module={m} onSaved={onCatalogueSaved} />
          </td>
        </tr>
      )}
    </>
  );
}

function siteSummary(siteIds: string[], sites: { id: string; name: string }[]): string {
  const names = siteIds.map((id) => sites.find((s) => s.id === id)?.name).filter((n): n is string => Boolean(n));
  if (!names.length) return "No sites chosen";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

function SitePicker({
  sites,
  initial,
  busy,
  onCancel,
  onSave,
}: {
  sites: { id: string; name: string }[];
  initial: string[];
  busy: boolean;
  onCancel: () => void;
  onSave: (siteIds: string[]) => void;
}) {
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(initial));

  if (!sites.length) {
    return <p className="text-sm text-slate-500">Your company has no sites yet. Add a site first.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-800">Which sites is this module for?</p>
      <p className="text-xs text-slate-500">
        It applies to people assigned to, inducted on, or running any of these sites.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <label key={site.id} className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={chosen.has(site.id)}
              onChange={(e) => {
                const next = new Set(chosen);
                if (e.target.checked) next.add(site.id);
                else next.delete(site.id);
                setChosen(next);
              }}
            />
            {site.name}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || chosen.size === 0} onClick={() => onSave([...chosen])}>
          {busy ? "Saving…" : `Use ${chosen.size} ${chosen.size === 1 ? "site" : "sites"}`}
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function CompanyMaterialControl({ module: m, onChanged }: { module: CatalogueModule; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState<"video" | "document" | "remove" | null>(null);

  async function upload(type: "video" | "document", file: File) {
    setBusy(type);
    try {
      const stagedToken = await stageUpload(type === "video" ? "training-video" : "training-document", file);
      const res = await fetch(`/api/training-admin/modules/${m.id}/material`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, stagedToken }),
      });
      if (!res.ok) {
        toast.error(await readError(res, "Couldn't upload the file"));
        return;
      }
      toast.success(type === "video" ? "Video uploaded" : "PDF uploaded");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't upload the file");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    const what = m.companyMaterial?.type === "document" ? "PDF" : "video";
    if (!window.confirm(`Remove your ${what} for ${m.title}?`)) return;
    setBusy("remove");
    try {
      const res = await fetch(`/api/training-admin/modules/${m.id}/material`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        toast.error(await readError(res, "Couldn't remove the file"));
        return;
      }
      const json = (await res.json().catch(() => ({}))) as { switchedOff?: boolean };
      toast.success(json.switchedOff ? "Removed. The module is off until it has a video or PDF again." : "Removed");
      await onChanged();
    } finally {
      setBusy(null);
    }
  }

  const has = m.companyMaterial?.type;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
      <FilePickLink
        label={busy === "video" ? "Uploading…" : has === "video" ? "Replace video" : "Upload video"}
        accept="video/mp4,video/quicktime,video/webm"
        disabled={busy !== null}
        onFile={(file) => upload("video", file)}
      />
      <FilePickLink
        label={busy === "document" ? "Uploading…" : has === "document" ? "Replace PDF" : "Upload PDF"}
        accept="application/pdf"
        disabled={busy !== null}
        onFile={(file) => upload("document", file)}
      />
      {has && (
        <button type="button" disabled={busy !== null} onClick={remove} className="text-xs text-red-600 hover:underline">
          {busy === "remove" ? "Removing…" : "Remove"}
        </button>
      )}
    </div>
  );
}

function FilePickLink({
  label,
  accept,
  disabled,
  onFile,
}: {
  label: string;
  accept: string;
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label className={`text-xs text-blue-600 ${disabled ? "opacity-60" : "cursor-pointer hover:underline"}`}>
      {label}
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function CatalogueVideoForm({ module: m, onSaved }: { module: CatalogueModule; onSaved: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState(m.externalUrl ?? "");
  const [publisher, setPublisher] = useState(m.publisher ?? "");
  const [acknowledgement, setAcknowledgement] = useState(m.acknowledgement ?? "");
  const [minWatch, setMinWatch] = useState(m.minWatchSeconds ? String(m.minWatchSeconds) : "");
  const [saving, setSaving] = useState(false);

  async function save(removeVideo = false) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        externalUrl: externalUrl.trim() || null,
        externalPublisher: publisher.trim() || null,
        externalAcknowledgement: acknowledgement.trim() || null,
        minWatchSeconds: minWatch.trim() ? Number(minWatch) : null,
      };
      if (file) body.stagedToken = await stageUpload("training-video", file);
      if (removeVideo) body.removeVideo = true;
      const res = await fetch(`/api/training-admin/catalogue/${m.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error(await readError(res, "Couldn't save"));
        return;
      }
      toast.success("Saved");
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-800">Default video for every company</p>
        <p className="text-xs text-slate-500">
          MP4 under 50 MB. Used by companies that haven&apos;t uploaded their own. Played from a private link that expires.
        </p>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        {m.source === "video" && (
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => save(true)}>
            Remove our video
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-800">Or a publisher&apos;s page</p>
        <p className="text-xs text-slate-500">
          Opens in the browser. Use this for HSE and other official films we have not cleared to host. Our video wins if both
          are set.
        </p>
        <Input label="Link (https)" value={externalUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalUrl(e.target.value)} />
        <Input label="Publisher" value={publisher} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPublisher(e.target.value)} placeholder="e.g. HSE" />
        <Input
          label="Acknowledgement line"
          value={acknowledgement}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAcknowledgement(e.target.value)}
        />
        <Input
          label="Minimum watch time (seconds)"
          type="number"
          min={10}
          max={3600}
          value={minWatch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinWatch(e.target.value)}
        />
      </div>
      <div className="md:col-span-2">
        <Button size="sm" disabled={saving} onClick={() => save(false)}>
          {saving ? "Saving…" : "Save video settings"}
        </Button>
      </div>
    </div>
  );
}
