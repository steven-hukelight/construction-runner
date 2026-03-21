"use client";

import React, { useState, useRef } from "react";
import { MoreHorizontal, Eye, MapPin, RotateCcw, FileQuestion, Shield, Trash2, Upload, CheckCircle } from "lucide-react";
import type { ComplianceRow } from "../server";

type Props = {
  row: ComplianceRow;
  isSubcontractorAdmin: boolean;
  onViewDetails: (userId: string) => void;
  onAssignToSite?: (userId: string, siteId: string) => void;
  onResetInduction?: (userId: string, siteId: string) => void;
  onRequestDocuments?: (userId: string) => void;
  onApplyOverride?: (userId: string) => void;
  onRemoveFromSite?: (userId: string, siteId: string) => void;
};

export default function ComplianceRowActions({
  row,
  isSubcontractorAdmin,
  onViewDetails,
  onAssignToSite,
  onResetInduction,
  onRequestDocuments,
  onApplyOverride,
  onRemoveFromSite,
}: Props) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setOpenUpward(window.innerHeight - rect.bottom < 200);
    }
    setOpen((o) => !o);
  };
  const canAssign = row.status === "compliant" || row.status === "grandfathered" || row.status === "override_applied";

  const actions: { label: string; icon: React.ElementType; onClick?: () => void; adminOnly?: boolean }[] = [
    { label: "View Details", icon: Eye, onClick: () => onViewDetails(row.userId) },
    ...(canAssign && onAssignToSite && !isSubcontractorAdmin
      ? [{ label: "Assign to Site", icon: MapPin, onClick: () => onAssignToSite(row.userId, row.siteId) }]
      : []),
    ...(onResetInduction && !isSubcontractorAdmin
      ? [{ label: "Reset Induction", icon: RotateCcw, onClick: () => onResetInduction(row.userId, row.siteId) }]
      : []),
    ...(onRequestDocuments
      ? [{ label: "Request Documents", icon: FileQuestion, onClick: () => onRequestDocuments(row.userId) }]
      : []),
    ...(onApplyOverride && !isSubcontractorAdmin
      ? [{ label: "Apply Override", icon: Shield, onClick: () => onApplyOverride(row.userId) }]
      : []),
    ...(onRemoveFromSite && !isSubcontractorAdmin
      ? [{ label: "Remove from Site", icon: Trash2, onClick: () => onRemoveFromSite(row.userId, row.siteId) }]
      : []),
    ...(isSubcontractorAdmin
      ? [
          { label: "Upload Missing Documents", icon: Upload },
          { label: "Request Verification", icon: CheckCircle },
        ]
      : []),
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute right-0 z-20 w-48 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${openUpward ? "bottom-full mb-1" : "top-full mt-1"}`}
          >
            {actions.map((a, i) => {
              const Icon = a.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    a.onClick?.();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {a.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
