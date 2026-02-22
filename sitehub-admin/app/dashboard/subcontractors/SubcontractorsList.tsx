"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Button from "../components/ui/Button";
import InviteSubcontractorModal from "./InviteSubcontractorModal";

type Subcontractor = {
  id: string;
  name: string | null;
  logoUrl: string | null;
  type: string;
  operativeCount: number;
  siteCount: number;
};

export default function SubcontractorsList() {
  const [list, setList] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  function fetchList() {
    setLoading(true);
    fetch("/api/subcontractors", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setList(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-gray-600">
          Partner companies linked to your sites. Invite new subcontractors with a code per site.
        </p>
        <Button onClick={() => setModalOpen(true)}>Invite Subcontractor</Button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          Loading…
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600 mb-4">No subcontractor partners yet.</p>
          <Button onClick={() => setModalOpen(true)}>Invite Subcontractor</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                  {c.logoUrl ? (
                    <Image src={c.logoUrl} alt="" width={48} height={48} className="object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-blue-600">
                      {(c.name || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">{c.name || "Unnamed"}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {c.operativeCount} operative{c.operativeCount !== 1 ? "s" : ""} · {c.siteCount} site{c.siteCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <InviteSubcontractorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchList}
      />
    </div>
  );
}
