"use client";

import { useState } from "react";
import Image from "next/image";
import Button from "../components/ui/Button";
import Table from "../components/ui/Table";
import { TableNameCell } from "../components/ui/TableChrome";
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
  const fetcher = async (url: string) => {
    const res = await fetch(url, { cache: "no-store", credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? (data as Subcontractor[]) : [];
  };

  const { data: list = [], isLoading, error, mutate } = useSWR<Subcontractor[]>(
    "/api/subcontractors",
    fetcher,
    { refreshInterval: 30000 }
  );
  const [modalOpen, setModalOpen] = useState(false);

  const fetchList = () => mutate();

  return (
    <div className="space-y-6">
      <Table
        actions={
          <Button type="button" onClick={() => setModalOpen(true)}>
            Invite subcontractor
          </Button>
        }
        loading={isLoading && list.length === 0}
        error={Boolean(error) && list.length === 0}
        onRetry={() => void mutate()}
        thing="subcontractors"
        things="subcontractors"
        emptyAction={
          <Button type="button" onClick={() => setModalOpen(true)}>
            Invite subcontractor
          </Button>
        }
        columns={[
          {
            header: "Company",
            accessor: "name",
            render: (c: Subcontractor) => (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-700">
                  {c.logoUrl ? (
                    <Image src={c.logoUrl} alt="" width={36} height={36} className="object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {(c.name || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <TableNameCell label={c.name || "Unnamed"} detail={c.type} />
              </div>
            ),
          },
          {
            header: "Operatives",
            accessor: "operativeCount",
            type: "numeric",
            render: (c: Subcontractor) => c.operativeCount,
          },
          {
            header: "Sites",
            accessor: "siteCount",
            type: "numeric",
            render: (c: Subcontractor) => c.siteCount,
          },
        ]}
        data={list}
      />

      <InviteSubcontractorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchList}
      />
    </div>
  );
}
