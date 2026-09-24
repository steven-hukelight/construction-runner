import type { jsPDF } from "jspdf";
import type { LogoForPdf } from "./fetchCompanyLogoForPdf";
import { formatPdfDateTime } from "./formatPdfDateTime";

/** Shared visual language for Construction Runner PDF exports. */
export const PDF_THEME = {
  margin: 16,
  headerBandH: 28,
  footerH: 14,
  /** Deep navy — construction / site ops, not generic SaaS purple */
  accent: [30, 58, 95] as const,
  accentSoft: [232, 238, 246] as const,
  text: [28, 32, 38] as const,
  muted: [100, 110, 124] as const,
  rule: [210, 216, 224] as const,
  white: [255, 255, 255] as const,
} as const;

export type PdfBranding = {
  companyName?: string | null;
  logo?: LogoForPdf | null;
};

export type PdfHeaderOptions = {
  title: string;
  subtitle?: string | null;
  metaLines?: string[];
  branding?: PdfBranding | null;
};

function setRgb(
  doc: jsPDF,
  which: "draw" | "fill" | "text",
  rgb: readonly [number, number, number],
) {
  const [r, g, b] = rgb;
  if (which === "draw") doc.setDrawColor(r, g, b);
  else if (which === "fill") doc.setFillColor(r, g, b);
  else doc.setTextColor(r, g, b);
}

function drawLogo(
  doc: jsPDF,
  logo: LogoForPdf,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  try {
    const props = doc.getImageProperties(logo.base64);
    const iw = props.width;
    const ih = props.height;
    if (!iw || !ih) return { w: 0, h: 0 };
    const ratio = Math.min(maxW / iw, maxH / ih);
    const w = iw * ratio;
    const h = ih * ratio;
    doc.addImage(logo.base64, logo.format, x, y, w, h);
    return { w, h };
  } catch {
    return { w: 0, h: 0 };
  }
}

/**
 * Draws a branded header band (logo + company + title) and returns the Y
 * coordinate where body content should start.
 */
export function drawDocumentHeader(doc: jsPDF, opts: PdfHeaderOptions): number {
  const { margin, headerBandH, accent, accentSoft, text, muted, white } = PDF_THEME;
  const pageWidth = doc.internal.pageSize.getWidth();
  const branding = opts.branding;

  // Top accent strip
  setRgb(doc, "fill", accent);
  doc.rect(0, 0, pageWidth, 3.5, "F");

  // Soft header band
  setRgb(doc, "fill", accentSoft);
  doc.rect(0, 3.5, pageWidth, headerBandH, "F");

  let textLeft = margin;
  if (branding?.logo) {
    const { w } = drawLogo(doc, branding.logo, margin, 7, 36, 18);
    if (w > 0) textLeft = margin + w + 8;
  }

  const company = (branding?.companyName ?? "").trim();
  let titleY = 12;
  if (company) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setRgb(doc, "text", accent);
    doc.text(company.toUpperCase(), textLeft, titleY);
    titleY = 19;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(company ? 13 : 15);
  setRgb(doc, "text", text);
  const titleLines = doc.splitTextToSize(opts.title, pageWidth - textLeft - margin);
  doc.text(titleLines, textLeft, titleY);

  let y = 3.5 + headerBandH + 8;

  if (opts.subtitle?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setRgb(doc, "text", muted);
    const sub = doc.splitTextToSize(opts.subtitle.trim(), pageWidth - margin * 2);
    doc.text(sub, margin, y);
    y += sub.length * 5 + 2;
  }

  const metas = [
    ...(opts.metaLines ?? []).filter((m) => m?.trim()),
    `Generated ${formatPdfDateTime(new Date())}`,
  ];
  if (metas.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setRgb(doc, "text", muted);
    for (const line of metas) {
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 2;
  }

  // Divider under header block
  setRgb(doc, "draw", PDF_THEME.rule);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  setRgb(doc, "text", text);
  setRgb(doc, "draw", PDF_THEME.rule);
  // reset fill unused
  setRgb(doc, "fill", white);

  return y;
}

/** Page numbers + product footer on every page. */
export function drawDocumentFooters(
  doc: jsPDF,
  footerLabel = "Construction Runner",
): void {
  const { margin, footerH, muted, rule, accent } = PDF_THEME;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();

  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 8;

    setRgb(doc, "draw", rule);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - footerH, pageWidth - margin, pageHeight - footerH);

    // Tiny accent mark
    setRgb(doc, "fill", accent);
    doc.rect(margin, pageHeight - footerH, 8, 0.8, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setRgb(doc, "text", muted);
    doc.text(footerLabel, margin + 10, footerY);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin, footerY, {
      align: "right",
    });
  }
}

export function contentBottom(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - PDF_THEME.footerH - 4;
}

/** Ensure vertical space; adds a page if needed. Returns new Y. */
export function ensurePdfSpace(
  doc: jsPDF,
  y: number,
  need: number,
  onNewPage?: (doc: jsPDF) => number,
): number {
  if (y + need <= contentBottom(doc)) return y;
  doc.addPage();
  if (onNewPage) return onNewPage(doc);
  return PDF_THEME.margin + 4;
}

export function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  y = ensurePdfSpace(doc, y, 14);
  const { margin, accent, accentSoft, text } = PDF_THEME;
  const pageWidth = doc.internal.pageSize.getWidth();

  setRgb(doc, "fill", accentSoft);
  doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 9, 1, 1, "F");

  setRgb(doc, "fill", accent);
  doc.rect(margin, y - 4, 1.6, 9, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setRgb(doc, "text", text);
  doc.text(title, margin + 5, y + 2);
  return y + 10;
}

export function drawFieldRow(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  opts?: { labelWidth?: number },
): number {
  const { margin, muted, text } = PDF_THEME;
  const pageWidth = doc.internal.pageSize.getWidth();
  const labelW = opts?.labelWidth ?? 42;
  const valueMax = pageWidth - margin * 2 - labelW - 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setRgb(doc, "text", muted);
  const labelLines = doc.splitTextToSize(label, labelW);
  doc.setFont("helvetica", "normal");
  setRgb(doc, "text", text);
  const valueLines = doc.splitTextToSize(value || "—", valueMax);
  const lines = Math.max(labelLines.length, valueLines.length);
  y = ensurePdfSpace(doc, y, lines * 4.5 + 2);

  doc.setFont("helvetica", "bold");
  setRgb(doc, "text", muted);
  doc.text(labelLines, margin, y);
  doc.setFont("helvetica", "normal");
  setRgb(doc, "text", text);
  doc.text(valueLines, margin + labelW, y);
  return y + lines * 4.5 + 1.5;
}

export function drawBodyParagraph(
  doc: jsPDF,
  text: string,
  y: number,
  opts?: { fontSize?: number },
): number {
  const { margin } = PDF_THEME;
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(opts?.fontSize ?? 10);
  setRgb(doc, "text", PDF_THEME.text);
  const wrapped = doc.splitTextToSize(text || "—", pageWidth - margin * 2);
  for (const line of wrapped) {
    y = ensurePdfSpace(doc, y, 6);
    doc.text(line, margin, y);
    y += 5;
  }
  return y + 2;
}

export function drawTableHeader(
  doc: jsPDF,
  columns: { label: string; x: number; width?: number }[],
  y: number,
): number {
  y = ensurePdfSpace(doc, y, 10);
  const { margin, accent, white, rule } = PDF_THEME;
  const pageWidth = doc.internal.pageSize.getWidth();

  setRgb(doc, "fill", accent);
  doc.rect(margin, y - 4, pageWidth - margin * 2, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setRgb(doc, "text", white);
  for (const col of columns) {
    doc.text(col.label, col.x, y + 1.5);
  }
  setRgb(doc, "draw", rule);
  return y + 8;
}

/** Default meta for list-style exports. */
export function defaultGeneratedMeta(extra?: string[]): string[] {
  return [...(extra ?? [])];
}
