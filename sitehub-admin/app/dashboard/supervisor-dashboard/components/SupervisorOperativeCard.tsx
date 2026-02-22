"use client";

import React from "react";
import type { SupervisorOperativeRow } from "../utils/buildSupervisorComplianceDataset";
import SupervisorInductionStatusBadge from "./SupervisorInductionStatusBadge";
import SupervisorMissingItems from "./SupervisorMissingItems";
import SupervisorExpiryWarnings from "./SupervisorExpiryWarnings";
import RAMSStatusBadge from "../../components/RAMSStatusBadge";

type Props = {
  operative: SupervisorOperativeRow;
  onClick: () => void;
};

export default function SupervisorOperativeCard({ operative, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm shrink-0">
            {(operative.operativeName || "?")[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate">{operative.operativeName}</div>
            <div className="text-xs text-gray-500">{operative.companyName}</div>
            {operative.trade && (
              <div className="text-xs text-gray-600 mt-0.5">{operative.trade}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RAMSStatusBadge status={operative.ramsStatus} />
          <SupervisorMissingItems items={operative.missingItems} />
          <SupervisorExpiryWarnings items={operative.expiringItems} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SupervisorInductionStatusBadge status={operative.inductionStatus} />
        {operative.grandfathered && (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-blue-100 text-blue-800">
            Grandfathered
          </span>
        )}
        {operative.overrideApplied && (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-purple-100 text-purple-800">
            Override
          </span>
        )}
        <span className="text-xs text-gray-500">
          Pre-Induction: {operative.preInductionStatus.replace("_", " ")}
        </span>
      </div>
    </div>
  );
}
