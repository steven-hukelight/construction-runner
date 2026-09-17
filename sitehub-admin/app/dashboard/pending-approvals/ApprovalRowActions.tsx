"use client";

import { useState } from "react";
import Button from "../components/ui/Button";
import { assignableStaffRoles, usesAssignedSites } from "@/lib/auth/roles";

type Site = { id: string; name: string };

export default function ApprovalRowActions({
  regId,
  defaultRole,
  approverRole,
  sites,
  onApprove,
  onReject,
}: {
  regId: string;
  defaultRole: string;
  approverRole: string | null;
  sites: Site[];
  onApprove: (id: string, role: string, siteIds: string[]) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
}) {
  const options = assignableStaffRoles(approverRole);
  const initial = options.some((o) => o.value === defaultRole) ? defaultRole : options[0]?.value ?? "OPERATIVE";
  const [role, setRole] = useState(initial);
  const [siteIds, setSiteIds] = useState<string[]>([]);

  const needsSites = usesAssignedSites(role);

  return (
    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-start">
      <div className="space-y-2">
        <select
          className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-2 py-1.5 text-sm min-w-[10rem]"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {needsSites && (
          <div className="max-h-36 min-w-[12rem] space-y-1 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-600 p-2 text-left">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Sites they can access (tick all that apply)
            </p>
            {sites.length === 0 && <p className="text-xs text-slate-500">No sites yet.</p>}
            {sites.map((site) => {
              const checked = siteIds.includes(site.id);
              return (
                <label key={site.id} className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSiteIds((prev) =>
                        e.target.checked ? [...prev, site.id] : prev.filter((id) => id !== site.id)
                      );
                    }}
                  />
                  {site.name}
                </label>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          type="button"
          onClick={() => {
            if (needsSites && siteIds.length === 0) {
              alert("Tick at least one site. They can be assigned to more than one.");
              return;
            }
            void onApprove(regId, role, siteIds);
          }}
        >
          Approve
        </Button>
        <Button size="sm" type="button" variant="secondary" onClick={() => void onReject(regId)}>
          Reject
        </Button>
      </div>
    </div>
  );
}
