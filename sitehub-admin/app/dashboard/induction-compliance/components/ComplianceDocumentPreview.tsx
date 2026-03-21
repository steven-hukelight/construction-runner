"use client";

import React from "react";
import { FileText, Image as ImageIcon, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { getPreInductionFileViewUrl } from "@/lib/preInductionFileUrl";

type DocItem = {
  url?: string;
  type?: string;
  label?: string;
  expiry?: Date | null;
  verified?: boolean;
};

type Props = {
  documents: DocItem[];
  isSubcontractorAdmin: boolean;
  onVerify?: (docId: string) => void;
  onReject?: (docId: string) => void;
  onUpload?: (docId: string) => void;
};

function formatExpiry(expiry: Date | null | undefined): string {
  if (!expiry) return "—";
  const d = expiry instanceof Date ? expiry : new Date(expiry);
  return d.toLocaleDateString();
}

export default function ComplianceDocumentPreview({
  documents,
  isSubcontractorAdmin,
  onVerify,
  onReject,
  onUpload,
}: Props) {
  if (!documents || documents.length === 0) {
    return <p className="text-sm text-gray-500">No documents uploaded.</p>;
  }

  return (
    <div className="space-y-3">
      {documents.map((doc, i) => {
        const id = `doc-${i}`;
        const isImage = (doc.url ?? "").match(/\.(jpg|jpeg|png|gif|webp)$/i);
        return (
          <div
            key={id}
            className="rounded-lg border border-gray-200 p-3 bg-gray-50/50"
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                {isImage ? (
                  <ImageIcon aria-hidden="true" className="h-5 w-5 text-gray-600" />
                ) : (
                  <FileText className="h-5 w-5 text-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {doc.label || doc.type || "Document"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Expiry: {formatExpiry(doc.expiry)}
                  {doc.verified !== undefined && (
                    <span className="ml-2">
                      {doc.verified ? (
                        <span className="text-emerald-600">Verified</span>
                      ) : doc.url ? (
                        <span className="text-emerald-600">Provided</span>
                      ) : (
                        <span className="text-amber-600">Pending</span>
                      )}
                    </span>
                  )}
                </div>
                {doc.url && (
                  <a
                    href={getPreInductionFileViewUrl(doc.url) ?? doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open document
                  </a>
                )}
                {!isSubcontractorAdmin && onVerify && doc.verified === false && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onVerify(id)}
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Verify
                    </button>
                    {onReject && (
                      <button
                        type="button"
                        onClick={() => onReject(id)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </button>
                    )}
                  </div>
                )}
                {isSubcontractorAdmin && onUpload && (
                  <button
                    type="button"
                    onClick={() => onUpload(id)}
                    className="mt-2 text-xs text-blue-600 hover:underline"
                  >
                    Upload replacement
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
