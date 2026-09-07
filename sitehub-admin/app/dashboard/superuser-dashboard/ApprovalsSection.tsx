"use client";
import { useEffect, useState } from "react";
import { useTableDensityClasses } from "@/app/DisplayPreferencesProvider";
import Button from "../components/ui/Button";
import EditRegistrationModal, { type Registration } from "./EditRegistrationModal";

export default function ApprovalsSection() {
  const density = useTableDensityClasses();
  const [pending, setPending] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Registration | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/registrations")
      .then((res) => res.json())
      .then((data) => {
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
      })
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(reg: { id: string; role?: string }) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: reg.id,
          role: (reg.role || "OPERATIVE").toString().toUpperCase(),
        }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((r) => r.id !== reg.id));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Approval failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReject(id: string) {
    setLoading(true);
    await fetch(`/api/registrations/${id}/reject`, { method: "POST" });
    setPending((prev) => prev.filter(r => r.id !== id));
    setLoading(false);
  }

  return (
    <div className="card p-6 mt-8">
      <h2 className="font-semibold text-gray-900 mb-2">Pending User Approvals</h2>
      {loading && <div className="text-blue-600">Loading...</div>}
      {pending.length === 0 && !loading && (
        <div className="text-gray-500">No pending registrations.</div>
      )}
      {pending.length > 0 && (
        <table className={`w-full mt-4 ${density.table}`}>
          <thead>
            <tr>
              <th className={`text-left ${density.th}`}>Name</th>
              <th className={`text-left ${density.th}`}>Email</th>
              <th className={`text-left ${density.th}`}>Company</th>
              <th className={`text-left ${density.th}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map(reg => (
              <tr key={reg.id}>
                <td className={density.td}>{reg.name}</td>
                <td className={density.td}>{reg.email}</td>
                <td className={density.td}>{reg.companyName}</td>
                <td className={density.td}>
                  <Button onClick={() => handleApprove(reg)} className="mr-2" size="sm" variant="primary">Approve</Button>
                  <Button onClick={() => handleReject(reg.id)} className="mr-2" size="sm" variant="danger">Reject</Button>
                  <Button onClick={() => setEditing(reg)} size="sm" variant="secondary">Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && (
        <EditRegistrationModal
          registration={editing}
          onClose={() => setEditing(null)}
          onSave={(updated: Partial<Registration>) => {
            setPending(prev => prev.map(r => r.id === editing.id ? { ...r, ...updated } : r));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
