"use client";
import toast from "react-hot-toast";

import { useCallback, useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import ApprovalRowActions from "./ApprovalRowActions";
import { getRoleFromClient } from "@/lib/utils/cookies";
import { roleDisplayName, usesAssignedSites } from "@/lib/auth/roles";
import Table from "../components/ui/Table";
import { TableNameCell } from "../components/ui/TableChrome";

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
      toast.error((err as { error?: string }).error ?? "Approval failed");
      return;
    }
    await load();
  }

  async function reject(id: string) {
    if (!confirm("Reject this registration? The user will remain unable to sign in until an admin invites them again.")) return;
    const res = await fetch(`/api/auth/registrations/${id}/reject`, { method: "POST", credentials: "include" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Reject failed");
      return;
    }
    await load();
  }

  return (
    <Table
      title="Pending registrations"
      subtitle={`${regs.length} waiting`}
      columns={[
        {
          header: "Name",
          accessor: "name",
          render: (r: Reg) => <TableNameCell icon={UserRound} label={r.name ?? "—"} />,
        },
        { header: "Email", accessor: "email", render: (r: Reg) => r.email ?? "—" },
        { header: "Company", accessor: "companyName", render: (r: Reg) => r.companyName ?? "—" },
        {
          header: "Requested",
          accessor: "role",
          render: (r: Reg) => roleDisplayName((r.role ?? "OPERATIVE").toString().toUpperCase()),
        },
        {
          header: "Assign role",
          accessor: "actions",
          render: (r: Reg) => (
            <ApprovalRowActions
              regId={r.id}
              defaultRole={(r.role ?? "OPERATIVE").toString().toUpperCase()}
              approverRole={approverRole}
              sites={sites}
              onApprove={approve}
              onReject={reject}
            />
          ),
        },
      ]}
      data={loading ? [] : regs}
      emptyMessage={loading ? "Loading…" : "No pending registrations."}
    />
  );
}
