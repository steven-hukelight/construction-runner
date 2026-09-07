"use client";

import React, { useState } from "react";
import { Shield, RotateCcw, MapPin, CheckCircle, FileQuestion, Trash2, Upload } from "lucide-react";

type Props = {
  userId: string;
  siteId?: string;
  isSubcontractorAdmin: boolean;
  onToggleOverride?: (userId: string) => void;
  onResetInduction?: (userId: string, siteId: string) => void;
  onAssignToSite?: (userId: string, siteId?: string, companyId?: string) => void;
  onVerifyAll?: (userId: string) => void;
  onRequestDocuments?: (userId: string) => void;
  onRemoveFromSite?: (userId: string, siteId: string) => void;
};

export default function ComplianceAdminActions({
  userId,
  siteId,
  isSubcontractorAdmin,
  onToggleOverride,
  onResetInduction,
  onAssignToSite,
  onVerifyAll,
  onRequestDocuments,
  onRemoveFromSite,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handle = async (key: string, fn: () => Promise<void> | void) => {
    setLoading(key);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  };

  const btnClass =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50";

  if (isSubcontractorAdmin) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnClass}
          onClick={() => handle("upload", () => { window.location.href = `/dashboard/users/${userId}/pre-induction`; })}
        >
          <Upload className="h-4 w-4" />
          Upload Missing Documents
        </button>
        <button
          type="button"
          className={btnClass}
          onClick={() => handle("request", () => onRequestDocuments?.(userId))}
          disabled={!onRequestDocuments}
        >
          <CheckCircle className="h-4 w-4" />
          Request Verification
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {onToggleOverride && (
        <button
          type="button"
          className={btnClass}
          onClick={() => handle("override", () => onToggleOverride(userId))}
          disabled={loading !== null}
        >
          <Shield className="h-4 w-4" />
          Toggle Pre-Induction Override
        </button>
      )}
      {onResetInduction && siteId && (
        <button
          type="button"
          className={btnClass}
          onClick={() => handle("reset", () => onResetInduction(userId, siteId))}
          disabled={loading !== null}
        >
          <RotateCcw className="h-4 w-4" />
          Reset Induction
        </button>
      )}
      {onAssignToSite && (
        <button
          type="button"
          className={btnClass}
          onClick={() => handle("assign", () => onAssignToSite(userId, siteId, undefined))}
          disabled={loading !== null}
        >
          <MapPin className="h-4 w-4" />
          Assign to Site
        </button>
      )}
      {onVerifyAll && (
        <button
          type="button"
          className={btnClass}
          onClick={() => handle("verify", () => onVerifyAll(userId))}
          disabled={loading !== null}
        >
          <CheckCircle className="h-4 w-4" />
          Verify All
        </button>
      )}
      {onRequestDocuments && (
        <button
          type="button"
          className={btnClass}
          onClick={() => handle("request", () => onRequestDocuments(userId))}
          disabled={loading !== null}
        >
          <FileQuestion className="h-4 w-4" />
          Request Missing Documents
        </button>
      )}
      {onRemoveFromSite && siteId && (
        <button
          type="button"
          className={`${btnClass} text-red-600 hover:bg-red-50`}
          onClick={() => handle("remove", () => onRemoveFromSite(userId, siteId))}
          disabled={loading !== null}
        >
          <Trash2 className="h-4 w-4" />
          Remove from Site
        </button>
      )}
    </div>
  );
}
