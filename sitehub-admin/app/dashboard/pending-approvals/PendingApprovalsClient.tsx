"use client";

import { useCallback, useEffect, useState } from "react";
import ApprovalRowActions from "./ApprovalRowActions";
import { getRoleFromClient } from "@/lib/utils/cookies";
import { roleDisplayName, usesAssignedSites } from "@/lib/auth/roles";

type Reg = {
  id: string;
  email?: string;
  name?: string;
  companyName?: string;
  role?: string;
  status?: string;
};

type Site = { id: string; name: string };

export default function PendingApprovalsClient() {
  const [regs, setRegs] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);
  const [approverRole, setApproverRole] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setApproverRole(getRoleFromClient()?.toLowerCase() ?? null);
      const [regRes, sitesRes] = await Promise.all([
        fetch("/api/auth/registrations", { credentials: "include", cache: "no-store" }),
        fetch("/api/sites", { credentials: "include", cache: "no-store" }),
      ]);
      const json = await regRes.json();
      setRegs(Array.isArray(json) ? json : []);
      const sitesJson = await sitesRes.json().catch(() => []);
      setSites(
        Array.isArray(sitesJson)
          ? sitesJson
              .map((s: { id?: string; name?: string }) => ({
                id: String(s.id ?? ""),
                name: String(s.name ?? s.id ?? ""),
              }))
              .filter((s: Site) => s.id)
          : []
      );
    } catch {
      setRegs([]);
    } finally {
      setLoading(false);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("pending-approvals-changed"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string, assignRole: string, siteIds: string[]) {
    const res = await fetch("/api/auth/registrations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        role: assignRole.toUpperCase(),
        siteIds: usesAssignedSites(assignRole) ? siteIds : [],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert((err as { error?: string }).error ?? "Approval failed");
      return;
    }
    await load();
  }

  async function reject(id: string) {
    if (!confirm("Reject this registration? The user will remain unable to sign in until an admin invites them again.")) return;
    const res = await fetch(`/api/auth/registrations/${id}/reject`, { method: "POST", credentials: "include" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert((err as { error?: string }).error ?? "Reject failed");
      return;
    }
    await load();
  }

  return (
    <div className="rounded-xl border border-gray-200/60 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      {loading && <p className="p-6 text-sm text-gray-500 dark:text-slate-400">Loading…</p>}
      {!loading && regs.length === 0 && (
        <p className="p-6 text-sm text-gray-500 dark:text-slate-400">No pending registrations.</p>
      )}
      {!loading && regs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-600">
              <tr>
                <th className="text-left font-semibold text-gray-700 dark:text-slate-200 px-4 py-3">Name</th>
                <th className="text-left font-semibold text-gray-700 dark:text-slate-200 px-4 py-3">Email</th>
                <th className="text-left font-semibold text-gray-700 dark:text-slate-200 px-4 py-3">Company</th>
                <th className="text-left font-semibold text-gray-700 dark:text-slate-200 px-4 py-3">Requested</th>
                <th className="text-right font-semibold text-gray-700 dark:text-slate-200 px-4 py-3">Assign role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {regs.map((r) => {
                const requested = (r.role ?? "OPERATIVE").toString().toUpperCase();
                return (
                  <tr key={r.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 text-gray-900 dark:text-slate-100 font-medium">{r.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{r.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{r.companyName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{roleDisplayName(requested)}</td>
                    <td className="px-4 py-3">
                      <ApprovalRowActions
                        regId={r.id}
                        defaultRole={requested}
                        approverRole={approverRole}
                        sites={sites}
                        onApprove={approve}
                        onReject={reject}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
