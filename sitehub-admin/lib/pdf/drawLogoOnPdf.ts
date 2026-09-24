import type { jsPDF } from "jspdf";
import type { LogoForPdf } from "./fetchCompanyLogoForPdf";

/** @deprecated Prefer documentChrome header; kept for one-off placements. */
export function drawLogoOnPdf(
  doc: jsPDF,
  logo: LogoForPdf,
  pageWidth: number,
  margin: number,
) {
  const maxW = 42;
  const maxH = 16;
  try {
    const props = doc.getImageProperties(logo.base64);
    const iw = props.width;
    const ih = props.height;
    if (!iw || !ih) return;
    const ratio = Math.min(maxW / iw, maxH / ih);
    const w = iw * ratio;
    const h = ih * ratio;
    const x = pageWidth - margin - w;
    doc.addImage(logo.base64, logo.format, x, ySafe(margin), w, h);
  } catch {
    /* optional */
  }
}

function ySafe(margin: number) {
  return margin;
}
