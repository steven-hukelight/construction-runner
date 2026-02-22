"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Button from "../../../components/ui/Button";
import { updateRAMSStatus } from "../../../rams/actions";

interface RAMS {
  id: string;
  title?: string;
  status?: string;
  version?: string;
  url?: string;
  fileUrl?: string;
  siteId?: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function RAMSDetailClient({ ramsId }: { ramsId: string }) {
  const [rams, setRams] = useState<RAMS | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/rams", { credentials: "include" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      const found = list.find((r: RAMS) => r.id === ramsId);
      setRams(found ?? null);
    } catch {
      setRams(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [ramsId]);

  async function handleApprove() {
    await updateRAMSStatus(ramsId, "APPROVED");
    setRams((r) => (r ? { ...r, status: "APPROVED" } : null));
  }

  async function handleReject() {
    await updateRAMSStatus(ramsId, "REJECTED");
    setRams((r) => (r ? { ...r, status: "REJECTED" } : null));
  }

  if (loading && !rams) {
    return <div className="text-slate-500 py-12 text-center">Loading RAMS...</div>;
  }

  if (!rams) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-600 mb-4">RAMS document not found.</p>
        <Link href="/dashboard/health-and-safety/rams">
          <Button variant="secondary">Back to RAMS</Button>
        </Link>
      </div>
    );
  }

  const fileUrl = rams.url ?? rams.fileUrl;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{rams.title || "Untitled"}</h2>
            <div className="flex gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-sm">
                {rams.status || "PENDING"}
              </span>
              {rams.version && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-sm">
                  v{rams.version}
                </span>
              )}
            </div>
          </div>
          <Link href="/dashboard/health-and-safety/rams">
            <Button variant="secondary" size="sm">Back</Button>
          </Link>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-slate-500">Site</dt>
            <dd>{rams.siteId || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Updated</dt>
            <dd>{rams.updatedAt || rams.createdAt ? new Date(rams.updatedAt || rams.createdAt!).toLocaleString() : "—"}</dd>
          </div>
        </dl>
      </div>

      {fileUrl && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Document</h3>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
          >
            View document
          </a>
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Version History</h3>
        <p className="text-slate-500 text-sm">
          {rams.version ? `Current version: ${rams.version}` : "No version recorded."}
        </p>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Supervisor Actions</h3>
        <div className="flex gap-2">
          {rams.status !== "APPROVED" && (
            <Button onClick={handleApprove}>Approve</Button>
          )}
          {rams.status !== "REJECTED" && (
            <Button variant="secondary" onClick={handleReject}>Reject</Button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Operative Acknowledgement</h3>
        <p className="text-slate-600 text-sm">
          Operatives can acknowledge RAMS via the mobile app or operative dashboard.
        </p>
      </div>
    </div>
  );
}
