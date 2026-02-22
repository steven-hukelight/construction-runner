"use client";

import React from "react";
import Link from "next/link";
import { FileQuestion, FileText, Flag, ExternalLink, ClipboardList } from "lucide-react";

type Props = {
  operativeId: string;
  siteId: string;
  onRequestDocuments?: () => void;
  onFlagOperative?: () => void;
};

export default function SupervisorActions({
  operativeId,
  siteId,
  onRequestDocuments,
  onFlagOperative,
}: Props) {
  const btnClass =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50";

  return (
    <div className="flex flex-wrap gap-2">
      {onRequestDocuments && (
        <button type="button" onClick={onRequestDocuments} className={btnClass}>
          <FileQuestion className="h-4 w-4" />
          Request Missing Documents
        </button>
      )}
      <Link
        href={`/dashboard/rams?siteId=${siteId}`}
        className={btnClass}
      >
        <FileText className="h-4 w-4" />
        View RAMS
      </Link>
      <Link
        href={`/dashboard/sites/${siteId}/induction`}
        className={btnClass}
      >
        <ClipboardList className="h-4 w-4" />
        View Induction Requirements
      </Link>
      {onFlagOperative && (
        <button type="button" onClick={onFlagOperative} className={btnClass}>
          <Flag className="h-4 w-4" />
          Flag Operative
        </button>
      )}
      <Link
        href={`/dashboard/users/${operativeId}/pre-induction`}
        className={btnClass}
      >
        <ExternalLink className="h-4 w-4" />
        Open Full Pre-Induction Profile
      </Link>
    </div>
  );
}
