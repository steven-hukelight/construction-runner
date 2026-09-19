"use client";

import React, { useMemo, useState } from "react";
import Table from "../components/ui/Table";
import { TableNameCell } from "../components/ui/TableChrome";
import { CheckCircle, Circle, UserRound } from "lucide-react";

interface Profile {
  id: string;
  displayName?: string;
  phone?: string;
  avatar?: string;
  email?: string;
  companyId?: string;
}

interface ProfilesTableProps {
  profiles: Profile[];
}

export default function ProfilesTable({ profiles }: ProfilesTableProps) {
  const [showCompleteOnly, setShowCompleteOnly] = useState(false);
  const [sortByCompletion, setSortByCompletion] = useState(false);

  const isProfileComplete = (p: Profile) => !!(p.phone?.trim?.() || p.avatar?.trim?.());

  const processedProfiles = useMemo(() => {
    let filtered = profiles;
    if (showCompleteOnly) {
      filtered = filtered.filter(isProfileComplete);
    }
    if (sortByCompletion) {
      filtered = [...filtered].sort((a, b) => {
        const aComplete = isProfileComplete(a) ? 1 : 0;
        const bComplete = isProfileComplete(b) ? 1 : 0;
        return bComplete - aComplete;
      });
    }
    return filtered;
  }, [profiles, showCompleteOnly, sortByCompletion]);

  const columns = [
    {
      header: "Name",
      accessor: "displayName",
      render: (row: Profile) => <TableNameCell icon={UserRound} label={row.displayName || row.email || "—"} />,
    },
    { header: "Email", accessor: "email" },
    {
      header: "Completion",
      accessor: "completion",
      render: (row: Profile) => {
        const complete = isProfileComplete(row);
        return (
          <span className="inline-flex items-center gap-1.5" title={complete ? "Profile completed" : "Incomplete / blank"}>
            {complete ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" aria-hidden />
            ) : (
              <Circle className="w-4 h-4 text-gray-300" aria-hidden />
            )}
            <span className="text-xs text-gray-600">{complete ? "Complete" : "Incomplete"}</span>
          </span>
        );
      },
    },
    { header: "Phone", accessor: "phone" },
    { header: "Avatar", accessor: "avatar" },
  ];

  return (
    <Table
      title="Profiles"
      subtitle={`${processedProfiles.length} profile${processedProfiles.length === 1 ? "" : "s"}`}
      actions={
        <>
          <button
            type="button"
            className="h-9 rounded-xl border border-blue-100 bg-[#f7fafc] px-3 text-xs font-medium text-slate-700 hover:bg-white"
            onClick={() => setShowCompleteOnly((v) => !v)}
          >
            {showCompleteOnly ? "Show all" : "Complete only"}
          </button>
          <button
            type="button"
            className="h-9 rounded-xl border border-blue-100 bg-[#f7fafc] px-3 text-xs font-medium text-slate-700 hover:bg-white"
            onClick={() => setSortByCompletion((v) => !v)}
          >
            {sortByCompletion ? "Default order" : "Sort by completion"}
          </button>
        </>
      }
      columns={columns}
      data={processedProfiles}
    />
  );
}
