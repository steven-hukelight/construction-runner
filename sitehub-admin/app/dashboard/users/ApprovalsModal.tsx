"use client";

import { useEffect, useState } from "react";
import Button from "../components/ui/Button";

type Registration = { id: string; name?: string; email?: string };

export default function ApprovalsModal() {
  const [open, setOpen] = useState(false);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/registrations");
      const json = await res.json();
      setRegs(json || []);
    } catch {
      setRegs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function approve(id: string, role = "VIEWER") {
    await fetch("/api/auth/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    load();
  }

  async function reject(id: string) {
    await fetch(`/api/auth/registrations/${id}/reject`, { method: "POST" });
    load();
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen((v) => !v)}>
        {open ? "Close" : "Approvals"}
      </Button>

      {open && (
        <div className="card w-full md:max-w-xl">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Pending Registrations
          </h3>

          <div className="space-y-4">
            {loading && <p className="text-sm text-slate-500">Loading...</p>}

            {!loading && regs.length === 0 && (
              <p className="text-sm text-slate-500">No pending registrations.</p>
            )}

            {regs.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {r.name || "—"}
                  </div>
                  <div className="text-xs text-slate-500">{r.email}</div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    defaultValue="VIEWER"
                    className="input bg-white text-slate-900 px-2 py-1 text-xs h-8 w-28"
                    id={`role-${r.id}`}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="VIEWER">Viewer</option>
                  </select>

                  <Button
                    size="sm"
                    type="button"
                    onClick={() =>
                      approve(
                        r.id,
                        (document.getElementById(
                          `role-${r.id}`
                        ) as HTMLSelectElement).value
                      )
                    }
                  >
                    Approve
                  </Button>

                  <Button
                    size="sm"
                    type="button"
                    variant="secondary"
                    onClick={() => reject(r.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
