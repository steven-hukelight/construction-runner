import { createReportPdf } from "@/lib/pdf/createReportPdf";
import type { LogoForPdf } from "@/lib/pdf/fetchCompanyLogoForPdf";
import { PDF_THEME } from "@/lib/pdf/documentChrome";
import type { ComplianceExportRow } from "./buildComplianceDataset";

const ROW_HEIGHT = 8;
const MARGIN = 16;

export function buildPdfDocument(
  dataset: ComplianceExportRow[],
  options?: { logo?: LogoForPdf | null; companyName?: string | null },
): Buffer {
  const report = createReportPdf({
    title: "Induction compliance Report",
    subtitle: `${dataset.length} operative${dataset.length === 1 ? "" : "s"}`,
    branding: {
      companyName: options?.companyName,
      logo: options?.logo,
    },
    footerLabel: "Construction Runner, compliance report",
    orientation: "landscape",
  });

  const { doc } = report;
  const pageWidth = report.pageWidth();
  const contentWidth = pageWidth - MARGIN * 2;

  const colWidths = [
    contentWidth * 0.1,
    contentWidth * 0.1,
    contentWidth * 0.08,
    contentWidth * 0.1,
    contentWidth * 0.05,
    contentWidth * 0.06,
    contentWidth * 0.12,
    contentWidth * 0.1,
    contentWidth * 0.05,
    contentWidth * 0.06,
  ];
  const cols = [
    "Operative",
    "Company",
    "Site",
    "Status",
    "Score",
    "RAMS",
    "Missing",
    "Expiring",
    "Override",
    "Grandfathered",
  ];

  const headerCols = cols.map((label, i) => {
    let x = MARGIN;
    for (let j = 0; j < i; j++) x += colWidths[j];
    return { label, x: x + 1 };
  });
  report.tableHeader(headerCols);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  dataset.forEach((row) => {
    report.ensureSpace(ROW_HEIGHT + 2);
    const y = report.y;

    const missingStr =
      row.missingItems.join("; ").slice(0, 30) +
      (row.missingItems.join("; ").length > 30 ? "…" : "");
    const expiringStr =
      row.expiringItems.join("; ").slice(0, 30) +
      (row.expiringItems.join("; ").length > 30 ? "…" : "");
    const ramsStr = row.ramsStatus || "—";

    const cells = [
      row.name.slice(0, 18) + (row.name.length > 18 ? "…" : ""),
      row.companyName.slice(0, 16) + (row.companyName.length > 16 ? "…" : ""),
      row.siteName.slice(0, 12) + (row.siteName.length > 12 ? "…" : ""),
      row.inductionStatus.slice(0, 12) +
        (row.inductionStatus.length > 12 ? "…" : ""),
      row.complianceScore != null ? String(row.complianceScore) : "—",
      ramsStr.slice(0, 8) + (ramsStr.length > 8 ? "…" : ""),
      missingStr || "—",
      expiringStr || "—",
      row.overrideApplied ? "Yes" : "—",
      row.grandfathered ? "Yes" : "—",
    ];

    doc.setTextColor(...PDF_THEME.text);
    let x = MARGIN;
    cells.forEach((cell, i) => {
      doc.text(cell, x + 1, y, { maxWidth: colWidths[i] - 2 });
      x += colWidths[i];
    });

    doc.setDrawColor(...PDF_THEME.rule);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y + 3, pageWidth - MARGIN, y + 3);
    report.setY(y + ROW_HEIGHT);
  });

  return report.toBuffer();
}
