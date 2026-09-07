/**
 * Fetch company logo from public URL for embedding in jsPDF (server-side).
 */
export type LogoForPdf = { base64: string; format: "PNG" | "JPEG" | "WEBP" };

const MAX_BYTES = 2_000_000;

export async function fetchCompanyLogoForPdf(
  logoUrl: string | null | undefined
): Promise<LogoForPdf | null> {
  const url = logoUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) return null;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    let format: LogoForPdf["format"] = "PNG";
    if (ct.includes("jpeg") || ct.includes("jpg")) format = "JPEG";
    else if (ct.includes("webp")) format = "WEBP";
    else if (ct.includes("png")) format = "PNG";
    return { base64: buf.toString("base64"), format };
  } catch {
    return null;
  }
}
