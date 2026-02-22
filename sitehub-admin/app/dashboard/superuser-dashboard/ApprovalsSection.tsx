"use client";
import { useEffect, useState } from "react";
import Button from "../components/ui/Button";
import EditRegistrationModal from "./EditRegistrationModal";

export default function ApprovalsSection() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/registrations")
      .then(res => res.json())
      .then(data => {
        // Only show registrations with status PENDING or COMPANY_ADMIN_PENDING
        const filtered = Array.isArray(data)
          ? data.filter(r => r.status === "PENDING" || r.status === "COMPANY_ADMIN_PENDING")
          : [];
        setPending(filtered);
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
          role: reg.role || "VIEWER",
          approverRole: "SUPERUSER",
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
    setPending(pending.filter(r => r.id !== id));
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
        <table className="w-full mt-4">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Email</th>
              <th className="text-left">Company</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map(reg => (
              <tr key={reg.id}>
                <td>{reg.name}</td>
                <td>{reg.email}</td>
                <td>{reg.companyName}</td>
                <td>
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
          onSave={(updated: { name?: string; email?: string; companyName?: string }) => {
            setPending(pending.map(r => r.id === editing.id ? { ...r, ...updated } : r));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
