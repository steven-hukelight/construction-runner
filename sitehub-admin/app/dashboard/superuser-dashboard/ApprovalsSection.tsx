"use client";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import Table from "../components/ui/Table";
import { TableNameCell } from "../components/ui/TableChrome";
import EditRegistrationModal, { type Registration } from "./EditRegistrationModal";
import ApprovalRowActions from "../pending-approvals/ApprovalRowActions";
import { useClientSession } from "../components/ClientSessionProvider";
import { usesAssignedSites } from "@/lib/auth/roles";

type Site = { id: string; name: string };

export default function ApprovalsSection() {
  const [pending, setPending] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Registration | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const { role: approverRole } = useClientSession();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/registrations").then((res) => res.json()),
      fetch("/api/sites", { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([data, sitesJson]) => {
        const filtered = Array.isArray(data)
          ? data
              .filter((row: { data?: { status?: string } }) => {
                const st = row.data?.status ?? "";
                return st === "PENDING" || st === "COMPANY_ADMIN_PENDING";
              })
              .map((row: { id: string; data?: Record<string, unknown> }) => ({
                id: row.id,
                ...(row.data ?? {}),
              }))
          : [];
        setPending(filtered as Registration[]);
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
      })
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: string, assignRole: string, siteIds: string[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id,
          role: assignRole.toUpperCase(),
          siteIds: usesAssignedSites(assignRole) ? siteIds : [],
        }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((r) => r.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Approval failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReject(id: string) {
    setLoading(true);
    await fetch(`/api/registrations/${id}/reject`, { method: "POST" });
    setPending((prev) => prev.filter((r) => r.id !== id));
    setLoading(false);
  }

  return (
    <div className="mt-8">
      <Table
        title="Pending user approvals"
        subtitle={`${pending.length} waiting`}
        columns={[
          {
            header: "Name",
            accessor: "name",
            render: (reg: Registration) => <TableNameCell icon={UserRound} label={reg.name || "—"} />,
          },
          { header: "Email", accessor: "email" },
          { header: "Company", accessor: "companyName" },
          {
            header: "Actions",
            accessor: "actions",
            render: (reg: Registration) => (
              <div className="flex flex-col items-end gap-2">
                <ApprovalRowActions
                  regId={reg.id}
                  defaultRole={(reg.role || "OPERATIVE").toString().toUpperCase()}
                  approverRole={approverRole}
                  sites={sites}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
                <button type="button" onClick={() => setEditing(reg)} className="table-link">
                  Edit
                </button>
              </div>
            ),
          },
        ]}
        data={loading ? [] : pending}
        emptyMessage={loading ? "Loading…" : "No pending registrations."}
      />
      {editing && (
        <EditRegistrationModal
          registration={editing}
          onClose={() => setEditing(null)}
          onSave={(updated: Partial<Registration>) => {
            setPending((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...updated } : r)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
