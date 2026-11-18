import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canEditWorkCatalogue, usesAssignedSites } from "@/lib/auth/roles";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { extractPlaceNamesFromPdf } from "@/lib/worklog/pdfNames";
import { siteOwnerId } from "@/lib/worklog/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 4_500_000;

async function callerCanUseSite(
  uid: string | null,
  role: string | null,
  companyId: string | null,
  siteId: string,
  owner: string,
) {
  if (role === "superuser") return true;
  if (usesAssignedSites(role)) {
    if (!uid) return false;
    const { data } = await supabaseAdmin
      .from("user_sites")
      .select("user_id")
      .eq("site_id", siteId)
      .eq("user_id", uid)
      .maybeSingle();
    return Boolean(data);
  }
  return Boolean(companyId && companyId === owner);
}

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export async function POST(req: Request) {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return auth;

  const form = await req.formData().catch(() => null);
  const siteId = String(form?.get("siteId") ?? "").trim();
  const file = form?.get("file");
  if (!siteId) return NextResponse.json({ error: "Choose a site" }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a PDF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That PDF is too large. Save it as CSV." }, { status: 400 });
  }

  try {
    const owner = await siteOwnerId(siteId);
    if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const staff = await callerCanUseSite(auth.uid, auth.role, auth.companyId, siteId, owner);
    if (!canEditWorkCatalogue(auth.role, staff)) {
      return NextResponse.json({ error: "You can't change this list" }, { status: 403 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPdf(bytes)) {
      return NextResponse.json({ error: "That file is not a PDF. Save as CSV instead." }, { status: 400 });
    }

    const names = await extractPlaceNamesFromPdf(bytes);
    if (!names.length) {
      return NextResponse.json(
        { error: "No plots in that PDF. Use a text PDF (not a scan), or CSV." },
        { status: 400 },
      );
    }
    return NextResponse.json({ names });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't read that PDF";
    console.error("POST /api/work-log/preview-pdf:", message);
    return NextResponse.json({ error: "Couldn't read that PDF. Try CSV." }, { status: 500 });
  }
}
