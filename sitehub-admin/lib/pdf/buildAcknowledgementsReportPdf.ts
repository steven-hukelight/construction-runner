import { formatPdfDateTime } from "./formatPdfDateTime";
import { createReportPdf } from "./createReportPdf";
import type { LogoForPdf } from "./fetchCompanyLogoForPdf";
import { PDF_THEME } from "./documentChrome";

export type AckPdfRow = {
  name: string;
  email: string;
  acknowledgedAt: string | null;
  hasSignature: boolean;
};

export type AckPdfInput = {
  /** e.g. "Briefing acknowledgements" | "RAMS acknowledgements" */
  documentLabel: string;
  documentTitle: string;
  companyName?: string | null;
  siteLine?: string | null;
  createdAt?: string | null;
  rows: AckPdfRow[];
  logo?: LogoForPdf | null;
};

export function buildAcknowledgementsReportPdf(input: AckPdfInput): Buffer {
  const metaLines: string[] = [];
  if (input.siteLine) metaLines.push(input.siteLine);
  if (input.createdAt) {
    metaLines.push(`Document created: ${formatPdfDateTime(input.createdAt)}`);
  }

  const report = createReportPdf({
    title: input.documentLabel,
    subtitle: input.documentTitle,
    metaLines,
    branding: {
      companyName: input.companyName,
      logo: input.logo,
    },
    footerLabel: "Construction Runner — acknowledgement report",
  });

  const { doc, margin } = report;
  const pageWidth = report.pageWidth();
  const colName = margin;
  const colEmail = margin + 42;
  const colAck = margin + 92;
  const colSig = margin + 132;

  report.tableHeader([
    { label: "Name", x: colName },
    { label: "Email", x: colEmail },
    { label: "Acknowledged", x: colAck },
    { label: "Signature", x: colSig },
  ]);

  const rowH = 7;
  for (const row of input.rows) {
    report.ensureSpace(rowH + 2);
    let y = report.y;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_THEME.text);
    const ack = row.acknowledgedAt ? formatPdfDateTime(row.acknowledgedAt) : "—";
    const sig = row.hasSignature ? "Yes" : "—";
    doc.text((row.name || "—").slice(0, 42), colName, y, { maxWidth: 38 });
    doc.text((row.email || "—").slice(0, 40), colEmail, y, { maxWidth: 46 });
    doc.text(ack.slice(0, 22), colAck, y, { maxWidth: 36 });
    doc.text(sig, colSig, y);
    y += rowH;
    // subtle rule
    doc.setDrawColor(...PDF_THEME.rule);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
    report.setY(y);
  }

  if (input.rows.length === 0) {
    report.paragraph("No acknowledgements yet.", 9);
  }

  return report.toBuffer();
}
