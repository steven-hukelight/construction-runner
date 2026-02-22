import type { ComplianceExportRow } from "./buildComplianceDataset";

function escapeCsv(value: string): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsvString(dataset: ComplianceExportRow[]): string {
  const headers = [
    "Operative Name",
    "Company",
    "Trade",
    "Site",
    "Pre-Induction Status",
    "Induction Status",
    "Override Applied",
    "Grandfathered",
    "Compliance Score",
    "Missing Items",
    "Expiring Items",
    "RAMS Status",
    "RAMS Version",
    "RAMS Accepted At",
    "Right to Work Verified",
    "Right to Work Expiry",
    "Certifications (Summary)",
    "Medical Verified",
    "Training (Summary)",
    "Declarations Accepted",
  ];

  const rows = dataset.map((row) => {
    const certSummary = row.certifications
      .map((c) => {
        const status = c.verified ? "Verified" : "Pending";
        const expStr = c.expiry
          ? c.expiry.toLocaleDateString("en-GB", { month: "2-digit", year: "numeric" })
          : "—";
        return `${c.type}: ${status} (${expStr})`;
      })
      .join("; ");

    const trainingSummary = row.training
      .map((t) => {
        const expStr = t.expiry
          ? t.expiry.toLocaleDateString("en-GB", { month: "2-digit", year: "numeric" })
          : "—";
        return `${t.title || "Training"}: ${expStr}`;
      })
      .join("; ");

    return [
      row.name,
      row.companyName,
      row.trade,
      row.siteName,
      row.preInductionStatus,
      row.inductionStatus,
      row.overrideApplied ? "Yes" : "No",
      row.grandfathered ? "Yes" : "No",
      row.complianceScore != null ? String(row.complianceScore) : "—",
      row.missingItems.join("; "),
      row.expiringItems.join("; "),
      row.ramsStatus || "—",
      row.ramsVersion || "—",
      row.ramsAcceptedAt ? row.ramsAcceptedAt.toLocaleString() : "—",
      row.rightToWork.verified ? "Yes" : "No",
      row.rightToWork.expiry
        ? row.rightToWork.expiry.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "—",
      certSummary || "—",
      row.medical.verified ? "Yes" : "No",
      trainingSummary || "—",
      row.declarations.operativeAccepted ? "Yes" : "No",
    ];
  });

  const headerLine = headers.map(escapeCsv).join(",");
  const dataLines = rows.map((r) => r.map(escapeCsv).join(","));
  return [headerLine, ...dataLines].join("\n");
}
