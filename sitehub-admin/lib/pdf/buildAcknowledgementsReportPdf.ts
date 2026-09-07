import { jsPDF } from "jspdf";
import { formatPdfDateTime } from "./formatPdfDateTime";
import { drawLogoOnPdf } from "./drawLogoOnPdf";
import type { LogoForPdf } from "./fetchCompanyLogoForPdf";

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
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = margin;

  if (input.logo) {
    drawLogoOnPdf(doc, input.logo, pageWidth, margin);
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(input.documentLabel, margin, y + 6);
  y += 14;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(input.documentTitle, margin, y);
  y += 8;

  if (input.companyName) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Company: ${input.companyName}`, margin, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
  }
  if (input.siteLine) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(input.siteLine, margin, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
  }
  if (input.createdAt) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Document created: ${formatPdfDateTime(input.createdAt)}`, margin, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
  }

  doc.setFontSize(9);
  doc.text(`Generated: ${formatPdfDateTime(new Date())}`, margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const colName = margin;
  const colEmail = margin + 42;
  const colAck = margin + 92;
  const colSig = margin + 132;
  doc.text("Name", colName, y);
  doc.text("Email", colEmail, y);
  doc.text("Acknowledged", colAck, y);
  doc.text("Signature", colSig, y);
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  const rowH = 7;
  for (const row of input.rows) {
    if (y > pageHeight - margin - rowH - 4) {
      doc.addPage("a4", "portrait");
      y = margin;
    }
    const ack = row.acknowledgedAt ? formatPdfDateTime(row.acknowledgedAt) : "—";
    const sig = row.hasSignature ? "Yes" : "—";
    doc.text((row.name || "—").slice(0, 42), colName, y, { maxWidth: 38 });
    doc.text((row.email || "—").slice(0, 40), colEmail, y, { maxWidth: 36 });
    doc.text(ack.slice(0, 22), colAck, y, { maxWidth: 36 });
    doc.text(sig, colSig, y);
    y += rowH;
  }

  if (input.rows.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("No acknowledgements yet.", margin, y);
    doc.setTextColor(0, 0, 0);
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Construction Runner — acknowledgement report",
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin - 5, pageHeight - 8);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
