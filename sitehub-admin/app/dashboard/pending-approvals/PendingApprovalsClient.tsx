"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "../components/ui/Button";
import { getRoleFromClient } from "@/lib/utils/cookies";

type Reg = {
  id: string;
  email?: string;
  name?: string;
  companyName?: string;
  role?: string;
  status?: string;
};

export default function PendingApprovalsClient() {
  const [regs, setRegs] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);
  const [approverRole, setApproverRole] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setApproverRole(getRoleFromClient()?.toLowerCase() ?? null);
      const res = await fetch("/api/auth/registrations", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      setRegs(Array.isArray(json) ? json : []);
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

  async function approve(id: string, assignRole: string) {
    const res = await fetch("/api/auth/registrations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role: assignRole.toUpperCase() }),
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

  function roleOptions(): { value: string; label: string }[] {
    const ar = approverRole ?? "";
    if (ar === "superuser" || ar === "admin") {
      return [
        { value: "OPERATIVE", label: "Operative" },
        { value: "SUPERVISOR", label: "Supervisor" },
        { value: "ADMIN", label: "Admin" },
      ];
    }
    if (ar === "supervisor" || ar === "sub_admin") {
      return [{ value: "OPERATIVE", label: "Operative" }];
    }
    return [{ value: "OPERATIVE", label: "Operative" }];
  }

  const options = roleOptions();

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
                <th className="text-left font-semibold text-gray-700 dark:text-slate-200 px-4 py-3">Assign role</th>
                <th className="text-right font-semibold text-gray-700 dark:text-slate-200 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {regs.map((r) => {
                const requested = (r.role ?? "OPERATIVE").toString().toUpperCase();
                const defaultAssign = options.some((o) => o.value === requested) ? requested : options[0]?.value ?? "OPERATIVE";
                return (
                  <tr key={r.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 text-gray-900 dark:text-slate-100 font-medium">{r.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{r.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{r.companyName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{requested}</td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-2 py-1.5 text-sm min-w-[9rem]"
                        id={`assign-${r.id}`}
                        defaultValue={defaultAssign}
                      >
                        {options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(`assign-${r.id}`) as HTMLSelectElement | null;
                          approve(r.id, el?.value ?? defaultAssign);
                        }}
                      >
                        Approve
                      </Button>
                      <Button size="sm" type="button" variant="secondary" onClick={() => reject(r.id)}>
                        Reject
                      </Button>
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
