"use client";

import { useState } from "react";
import Image from "next/image";
import Button from "../components/ui/Button";
import InviteSubcontractorModal from "./InviteSubcontractorModal";
import useSWR from "swr";

type Subcontractor = {
  id: string;
  name: string | null;
  logoUrl: string | null;
  type: string;
  operativeCount: number;
  siteCount: number;
};

export default function SubcontractorsList() {
  const fetcher = (url: string) =>
    fetch(url, { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => (Array.isArray(d) ? d : []));

  const { data: list = [], isLoading, mutate } = useSWR<Subcontractor[]>(
    "/api/subcontractors",
    fetcher,
    { refreshInterval: 30000 }
  );
  const [modalOpen, setModalOpen] = useState(false);

  const fetchList = () => mutate();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-gray-600 dark:text-slate-400">
          Partner companies linked to your sites. Invite new subcontractors with a code per site.
        </p>
        <Button onClick={() => setModalOpen(true)}>Invite Subcontractor</Button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-8 text-center text-gray-500 dark:text-slate-400">
          Loading…
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-12 text-center">
          <p className="text-gray-600 dark:text-slate-400 mb-4">No subcontractor partners yet.</p>
          <Button onClick={() => setModalOpen(true)}>Invite Subcontractor</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  {c.logoUrl ? (
                    <Image src={c.logoUrl} alt="" width={48} height={48} className="object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {(c.name || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">{c.name || "Unnamed"}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
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
