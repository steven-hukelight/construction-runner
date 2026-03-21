"use client";

import React, { useMemo, useState } from "react";
import Table from "../components/ui/Table";
import { CheckCircle, Circle } from "lucide-react";

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
    { header: "Name", accessor: "displayName" },
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
    <div className="card">
      <div className="flex items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Profiles</h3>
        <button
          type="button"
          className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
          onClick={() => setShowCompleteOnly((v) => !v)}
        >
          {showCompleteOnly ? "Show all" : "Complete only"}
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          onClick={() => setSortByCompletion((v) => !v)}
        >
          {sortByCompletion ? "Default order" : "Sort by completion"}
        </button>
      </div>
      <Table columns={columns} data={processedProfiles} />
    </div>
  );
}
