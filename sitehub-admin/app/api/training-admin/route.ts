import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTrainingOfficeAuth } from "@/lib/training/officeAuth";
import { loadCatalogue, loadCompanySettings, loadModuleSites, withCompanyMaterial } from "@/lib/training/service";
import { isPlayable } from "@/lib/training/rules";

export const dynamic = "force-dynamic";

/** Catalogue with this company's on/off and refresh settings. */
export async function GET(req: Request) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const [catalogue, settings, moduleSites, questions, sites] = await Promise.all([
      loadCatalogue(),
      loadCompanySettings(auth.companyId),
      loadModuleSites(auth.companyId),
      supabaseAdmin.from("training_questions").select("module_id"),
      supabaseAdmin.from("sites").select("id, name").eq("company_id", auth.companyId).order("name", { ascending: true }),
    ]);
    const questionCount = new Map<string, number>();
    for (const q of questions.data ?? []) {
      const id = String(q.module_id);
      questionCount.set(id, (questionCount.get(id) ?? 0) + 1);
    }
    return NextResponse.json({
      canConfigure: auth.canConfigure,
      canRecord: auth.canRecord,
      canEditCatalogue: auth.canEditCatalogue,
      sites: (sites.data ?? []).map((site) => ({ id: String(site.id), name: String(site.name ?? "").trim() || "Site" })),
      modules: catalogue.map((m) => {
        const s = settings.get(m.id);
        return {
          id: m.id,
          kind: m.kind,
          title: m.title,
          summary: m.summary,
          minutes: m.minutes,
          source: s?.video_path || s?.document_path ? "company" : m.video_path ? "video" : m.external_url ? "link" : null,
          companyMaterial: s?.video_path
            ? { type: "video", name: s.video_name ?? "Your video" }
            : s?.document_path
              ? { type: "document", name: s.document_name ?? "Your document" }
              : null,
          externalUrl: m.external_url,
          publisher: m.external_publisher,
          acknowledgement: m.external_acknowledgement,
          minWatchSeconds: m.min_watch_seconds,
          ready: m.kind === "record" || isPlayable(withCompanyMaterial(m, s)),
          questionCount: questionCount.get(m.id) ?? 0,
          enabled: s?.enabled === true,
          refreshMonths: s ? s.refresh_months : 12,
          scope: s?.scope ?? "company",
          siteIds: moduleSites.get(m.id) ?? [],
        };
      }),
    });
  } catch (e) {
    console.error("GET /api/training-admin:", e);
    return NextResponse.json({ error: "Couldn't load training" }, { status: 500 });
  }
}
