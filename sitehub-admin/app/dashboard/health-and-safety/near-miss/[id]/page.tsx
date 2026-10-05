import { redirect, notFound } from "next/navigation";
import NearMissDetailClient from "./NearMissDetailClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveSignedUrl } from "@/lib/storage/signedUrl";
import { deepSerializeForClient } from "@/lib/rscSerialize";
import { authorizeNearMissPageViewer, loadNearMissReportFor } from "@/lib/auth/nearMissAccess";

export const dynamic = "force-dynamic";

async function withSiteAndSignedAttachments<T extends { id: string; site_id?: unknown; attachments?: unknown }>(data: T) {
  let site_name: string | null = null;
  if (data.site_id) {
    const { data: site } = await supabaseAdmin.from("sites").select("name").eq("id", data.site_id).maybeSingle();
    site_name = site?.name ?? null;
  }
  const attachments = Array.isArray(data.attachments) ? data.attachments : [];
  const resolved = await Promise.all(
    attachments.map(async (att: { url?: string; path?: string; name?: string }) => {
      const raw = (att?.url ?? att?.path ?? "").trim();
      if (!raw) return { ...att, signedUrl: null };
      const signed = await resolveSignedUrl(raw);
      return { ...att, signedUrl: signed ?? raw };
    })
  );
  return { ...data, site_name, attachmentsWithSignedUrls: resolved };
}

export default async function NearMissDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await authorizeNearMissPageViewer();
  if (!viewer) redirect("/dashboard");

  const access = await loadNearMissReportFor(viewer, id);
  if (!access.ok) {
    if (access.response.status === 404) notFound();
    redirect("/dashboard/health-and-safety/near-miss");
  }

  const item = await withSiteAndSignedAttachments(access.report);
  const safeItem = deepSerializeForClient(item);
  const attachmentsWithSignedUrls = (
    safeItem as { attachmentsWithSignedUrls?: { url?: string; name?: string; signedUrl?: string | null }[] }
  ).attachmentsWithSignedUrls;

  return (
    <div className="relative space-y-8">
      <NearMissDetailClient item={safeItem} attachmentsWithSignedUrls={attachmentsWithSignedUrls} />
    </div>
  );
}
