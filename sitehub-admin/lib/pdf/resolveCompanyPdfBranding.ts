import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchCompanyLogoForPdf } from "./fetchCompanyLogoForPdf";
import type { PdfBranding } from "./documentChrome";

/** Load company display name + logo bytes for PDF headers. */
export async function resolveCompanyPdfBranding(
  companyId: string | null | undefined,
): Promise<PdfBranding> {
  const id = (companyId ?? "").trim();
  if (!id) return {};

  const { data } = await supabaseAdmin
    .from("companies")
    .select("name, logo_url")
    .eq("id", id)
    .maybeSingle();

  if (!data) return {};

  const row = data as { name?: string | null; logo_url?: string | null };
  const logo = await fetchCompanyLogoForPdf(row.logo_url);
  return {
    companyName: row.name?.trim() || null,
    logo,
  };
}
