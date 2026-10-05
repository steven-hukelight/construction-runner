"use client";
import toast from "react-hot-toast";

import { useEffect, useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { inviteUser } from "./actions";
import { useClientSession } from "../components/ClientSessionProvider";
import { assignableStaffRoles, usesAssignedSites } from "@/lib/auth/roles";

type Site = { id: string; name: string };

export default function InviteUserModal() {
  const [open, setOpen] = useState(false);
  const { role: approverRole } = useClientSession();
  const roleOptions = assignableStaffRoles(approverRole);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "OPERATIVE",
  });
  const [sites, setSites] = useState<Site[]>([]);
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/sites", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) =>
        setSites(
          Array.isArray(arr)
            ? arr
                .map((s: { id?: string; name?: string }) => ({
                  id: String(s.id ?? ""),
                  name: String(s.name ?? s.id ?? ""),
                }))
                .filter((s: Site) => s.id)
            : []
        )
      )
      .catch(() => setSites([]));
  }, [open]);

  async function handleSubmit() {
    if (usesAssignedSites(form.role) && siteIds.length === 0) {
      toast.error("Tick at least one site. They can be assigned to more than one.");
      return;
    }
    setSaving(true);
    try {
      await inviteUser({
        ...form,
        siteIds: usesAssignedSites(form.role) ? siteIds : [],
      });
      setOpen(false);
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen((v) => !v)}>
        {open ? "Close" : "Invite User"}
      </Button>
      {open && (
        <div className="card w-full md:max-w-xl">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">Invite User</h3>
          <div className="space-y-4 sm:space-y-5">
            <Input
              label="Name"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
            />

            <Input
              label="Email"
              value={form.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })}
            />

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Role</label>
              <select
                className="input w-full bg-transparent"
                value={form.role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, role: e.target.value })}
              >
                {roleOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {usesAssignedSites(form.role) && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">
                  Sites they can access (tick all that apply)
                </label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-600 p-2">
                  {sites.length === 0 && <p className="text-sm text-slate-400">No sites yet.</p>}
                  {sites.map((site) => (
                    <label key={site.id} className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={siteIds.includes(site.id)}
                        onChange={(e) =>
                          setSiteIds((prev) =>
                            e.target.checked ? [...prev, site.id] : prev.filter((id) => id !== site.id)
                          )
                        }
                      />
                      {site.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button onClick={handleSubmit} className="w-full" disabled={saving}>
                {saving ? "Inviting…" : "Invite"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
