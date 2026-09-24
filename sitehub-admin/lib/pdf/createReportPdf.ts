import { jsPDF } from "jspdf";
import type { LogoForPdf } from "./fetchCompanyLogoForPdf";
import {
  drawDocumentFooters,
  drawDocumentHeader,
  drawFieldRow,
  drawSectionTitle,
  drawBodyParagraph,
  drawTableHeader,
  ensurePdfSpace,
  PDF_THEME,
  type PdfBranding,
} from "./documentChrome";

export type CreateReportPdfOptions = {
  title: string;
  subtitle?: string | null;
  metaLines?: string[];
  branding?: PdfBranding | null;
  footerLabel?: string;
  orientation?: "portrait" | "landscape";
};

/**
 * Creates a branded report PDF and returns helpers for body content.
 * Call `finalize()` (or `applyFooters()` on the client) before output.
 */
export function createReportPdf(opts: CreateReportPdfOptions) {
  const doc = new jsPDF({
    orientation: opts.orientation ?? "portrait",
    unit: "mm",
    format: "a4",
  });

  let y = drawDocumentHeader(doc, {
    title: opts.title,
    subtitle: opts.subtitle,
    metaLines: opts.metaLines,
    branding: opts.branding,
  });

  const footerLabel = opts.footerLabel ?? "Construction Runner";

  return {
    doc,
    get y() {
      return y;
    },
    setY(next: number) {
      y = next;
    },
    margin: PDF_THEME.margin,
    pageWidth: () => doc.internal.pageSize.getWidth(),
    ensureSpace(need: number) {
      y = ensurePdfSpace(doc, y, need);
      return y;
    },
    section(title: string) {
      y = drawSectionTitle(doc, title, y);
      return y;
    },
    field(label: string, value: string, fieldOpts?: { labelWidth?: number }) {
      y = drawFieldRow(doc, label, value, y, fieldOpts);
      return y;
    },
    paragraph(text: string, fontSize?: number) {
      y = drawBodyParagraph(doc, text, y, { fontSize });
      return y;
    },
    tableHeader(columns: { label: string; x: number; width?: number }[]) {
      y = drawTableHeader(doc, columns, y);
      return y;
    },
    applyFooters() {
      drawDocumentFooters(doc, footerLabel);
    },
    /** Footers + bytes (works in Node and browser). */
    toUint8Array(): Uint8Array {
      drawDocumentFooters(doc, footerLabel);
      return new Uint8Array(doc.output("arraybuffer"));
    },
    /** Server convenience: footers + Buffer. */
    toBuffer(): Buffer {
      drawDocumentFooters(doc, footerLabel);
      return Buffer.from(doc.output("arraybuffer"));
    },
  };
}

export type { PdfBranding, LogoForPdf };
