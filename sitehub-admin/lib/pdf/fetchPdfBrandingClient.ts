"use client";

import type { LogoForPdf } from "@/lib/pdf/fetchCompanyLogoForPdf";
import type { PdfBranding } from "@/lib/pdf/documentChrome";

let cached: { at: number; branding: PdfBranding } | null = null;
const TTL_MS = 5 * 60 * 1000;

/** Fetch company name + logo for browser-side PDF exports (cookie auth). */
export async function fetchPdfBrandingClient(): Promise<PdfBranding> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.branding;
  try {
    const res = await fetch("/api/pdf/branding", { credentials: "include" });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      companyName?: string | null;
      logo?: LogoForPdf | null;
    };
    const branding: PdfBranding = {
      companyName: data.companyName ?? null,
      logo: data.logo ?? null,
    };
    cached = { at: Date.now(), branding };
    return branding;
  } catch {
    return {};
  }
}
