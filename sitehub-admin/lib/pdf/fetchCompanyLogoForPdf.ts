import sharp from "sharp";

/**
 * Fetch company logo from public URL for embedding in jsPDF (server-side).
 * Logos are downscaled because jsPDF embeds images at full resolution, which made
 * a 1024px logo add ~3MB and noticeable encode time to every report.
 */
export type LogoForPdf = { base64: string; format: "PNG" | "JPEG" | "WEBP" };

const MAX_BYTES = 2_000_000;
const MAX_EDGE_PX = 400;
const CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, { at: number; logo: LogoForPdf | null }>();

async function downscale(buf: Buffer): Promise<LogoForPdf | null> {
  try {
    const png = await sharp(buf)
      .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    return { base64: png.toString("base64"), format: "PNG" };
  } catch {
    return null;
  }
}

async function loadLogo(url: string): Promise<LogoForPdf | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0 || buf.length > MAX_BYTES) return null;

  const resized = await downscale(buf);
  if (resized) return resized;

  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  let format: LogoForPdf["format"] = "PNG";
  if (ct.includes("jpeg") || ct.includes("jpg")) format = "JPEG";
  else if (ct.includes("webp")) format = "WEBP";
  return { base64: buf.toString("base64"), format };
}

export async function fetchCompanyLogoForPdf(
  logoUrl: string | null | undefined
): Promise<LogoForPdf | null> {
  const url = logoUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;

  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.logo;

  try {
    const logo = await loadLogo(url);
    cache.set(url, { at: Date.now(), logo });
    return logo;
  } catch {
    return null;
  }
}
