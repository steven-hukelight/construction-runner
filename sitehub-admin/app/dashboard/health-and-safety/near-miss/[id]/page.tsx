import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import NearMissDetailClient from "./NearMissDetailClient";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function fetchNearMiss(id: string) {
  const { data } = await supabaseAdmin.from("near_miss_reports").select("*").eq("id", id).single();
  if (!data) return null;
  let site_name: string | null = null;
  if (data.site_id) {
    const { data: site } = await supabaseAdmin.from("sites").select("name").eq("id", data.site_id).maybeSingle();
    site_name = site?.name ?? null;
  }
  return { ...data, site_name };
}

export default async function NearMissDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }

  const item = await fetchNearMiss(id);
  if (!item) notFound();
  if (companyId && item.company_id !== companyId && role !== "superuser") {
    redirect("/dashboard/health-and-safety/near-miss");
  }

  return (
    <div className="relative space-y-8">
      <NearMissDetailClient item={item} />
    </div>
  );
}
